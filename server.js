// Custom server: Next.js + Socket.IO on one process.
require("dotenv").config();

const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

app.prepare().then(async () => {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const tf = require("@tensorflow/tfjs");
  
  let toxicity;
  let modelLoaded = false;
  let modelPromise = null;
  const THRESHOLD = Number(process.env.TOXICITY_THRESHOLD ?? 0.85);

  // Define labels
  const BLUR_LABELS = [
    "identity_attack",
    "threat", 
    "severe_toxicity",
    "sexual_explicit",
    "insult",
    "obscene",
    "toxicity"
  ];

  // Simple fallback detection (offline)
  function fallbackClassify(text) {
    const toxicWords = [
      'kill', 'murder', 'suicide', 'hate', 'stupid', 'idiot', 'dumb',
      'fuck', 'shit', 'damn', 'bastard', 'gay', 'lesbian', 'fag',
      'retard', 'retarded', 'ugly', 'fat', 'whore', 'slut'
    ];
    
    const matched = toxicWords.filter(word => 
      text.toLowerCase().includes(word)
    );
    
    if (matched.length === 0) {
      return { flagged: false, labels: [], severity: "none" };
    }
    
    // Check for severe words
    const severeWords = ['kill', 'murder', 'suicide', 'hate'];
    const isSevere = matched.some(w => severeWords.includes(w));
    
    return {
      flagged: true,
      labels: isSevere ? ['threat'] : ['insult'],
      severity: isSevere ? "blur" : "blur"
    };
  }

  async function getModel() {
    if (!modelPromise) {
      console.log('🔄 Loading HateShield model...');
      modelPromise = (async () => {
        try {
          // Try to load the real model
          if (!toxicity) {
            toxicity = require("@tensorflow-models/toxicity");
          }
          
          // Try CPU backend first (more compatible)
          await tf.setBackend('cpu');
          await tf.ready();
          
          console.log('✅ TensorFlow backend: cpu');
          const model = await toxicity.load(THRESHOLD, []);
          modelLoaded = true;
          console.log('✅ HateShield model loaded successfully!');
          return model;
        } catch (err) {
          console.error('❌ HateShield model failed to load:', err.message);
          console.log('⚠️ Using fallback keyword-based moderation');
          modelLoaded = false;
          return null;
        }
      })();
    }
    return modelPromise;
  }

  async function classifyMessage(text) {
    if (!text.trim()) return { 
      flagged: false, 
      topScore: 0, 
      labels: [], 
      severity: "none",
      blurLabels: [],
      warnLabels: [],
      warnOnly: false
    };
    
    try {
      const model = await getModel();
      
      // If real model is not loaded, use fallback
      if (!model || !modelLoaded) {
        const result = fallbackClassify(text);
        return {
          flagged: result.flagged,
          warnOnly: false,
          topScore: result.flagged ? 0.9 : 0,
          labels: result.labels,
          blurLabels: result.labels,
          warnLabels: [],
          severity: result.flagged ? "blur" : "none"
        };
      }

      // Use the real model
      const predictions = await model.classify([text]);
      let topScore = 0;
      const labels = [];
      
      for (const p of predictions) {
        const result = p.results[0];
        const probability = result.probabilities[1];
        if (result.match) labels.push(p.label);
        if (probability > topScore) topScore = probability;
      }

      const blurLabels = labels.filter(l => BLUR_LABELS.includes(l));
      const shouldBlur = blurLabels.length > 0;

      return { 
        flagged: shouldBlur,
        warnOnly: false,
        topScore, 
        labels,
        blurLabels,
        warnLabels: [],
        severity: shouldBlur ? "blur" : "none"
      };
    } catch (err) {
      console.error("Classification error:", err);
      // Fallback to keyword detection on error
      const result = fallbackClassify(text);
      return {
        flagged: result.flagged,
        warnOnly: false,
        topScore: result.flagged ? 0.9 : 0,
        labels: result.labels,
        blurLabels: result.labels,
        warnLabels: [],
        severity: result.flagged ? "blur" : "none"
      };
    }
  }

  const MAX_STRIKES_BEFORE_BAN = 3;

  // Initialize model
  getModel();

  const httpServer = createServer(handle);
  const io = new Server(httpServer, {
    path: "/api/socket",
  });

  global.io = io;

  io.use((socket, next2) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next2(new Error("unauthorized"));
      const payload = jwt.verify(token, JWT_SECRET);
      socket.data.user = payload;
      next2();
    } catch (err) {
      next2(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("arena:join", async ({ arenaCode }, ack) => {
      try {
        const arena = await prisma.arena.findUnique({ where: { code: arenaCode } });
        if (!arena) return ack?.({ ok: false, error: "Arena not found" });

        const member = await prisma.arenaMember.findUnique({
          where: { arenaId_userId: { arenaId: arena.id, userId: socket.data.user.userId } },
        });
        if (!member) return ack?.({ ok: false, error: "You are not a member of this arena" });
        if (member.status !== "ACTIVE") {
          return ack?.({ ok: false, error: `You are ${member.status.toLowerCase()} from this arena` });
        }

        socket.data.arenaId = arena.id;
        socket.data.memberId = member.id;
        socket.data.isMaster = member.isMaster;
        socket.join(arena.id);
        ack?.({ ok: true, playerNumber: member.playerNumber, isMaster: member.isMaster });
      } catch (err) {
        console.error(err);
        ack?.({ ok: false, error: "Server error joining arena" });
      }
    });

    socket.on("message:send", async ({ content, imageUrl }, ack) => {
      try {
        const { arenaId, memberId } = socket.data;
        if (!arenaId || !memberId) return ack?.({ ok: false, error: "Not in an arena" });

        const trimmed = (content || "").toString().trim().slice(0, 2000);
        const hasImage = typeof imageUrl === "string" && imageUrl.startsWith("/uploads/");

        if (!trimmed && !hasImage) return ack?.({ ok: false, error: "Empty message" });

        const member = await prisma.arenaMember.findUnique({ where: { id: memberId } });
        if (!member || member.status !== "ACTIVE") {
          return ack?.({ ok: false, error: "You can no longer send messages here" });
        }

        const result = trimmed
          ? await classifyMessage(trimmed)
          : { 
              flagged: false, 
              topScore: 0, 
              labels: [], 
              severity: "none",
              blurLabels: [],
              warnLabels: [],
              warnOnly: false
            };

        if (trimmed && result.flagged) {
          console.log(`[HateShield] BLURRED: "${trimmed}" → ${result.blurLabels.join(', ')}`);
        }

        let newStrikes = member.strikes;
        let newStatus = member.status;
        
        if (result.flagged) {
          newStrikes += 1;
          if (newStrikes >= MAX_STRIKES_BEFORE_BAN) {
            newStatus = "BANNED";
          }
        }

        const message = await prisma.message.create({
          data: {
            arenaId,
            memberId,
            content: trimmed,
            imageUrl: hasImage ? imageUrl : null,
            isBlurred: result.flagged,
            toxicityScore: result.topScore,
            toxicityLabels: result.labels,
          },
        });

        const socketsInArena = await io.in(arenaId).fetchSockets();

        for (const s of socketsInArena) {
          const isSender = s.data.memberId === memberId;
          const isMaster = s.data.isMaster;
          const canSeeContent = !message.isBlurred || isSender || isMaster;
          
          s.emit("message:new", {
            id: message.id,
            content: canSeeContent ? message.content : null,
            imageUrl: canSeeContent ? message.imageUrl : null,
            isBlurred: message.isBlurred,
            playerNumber: member.playerNumber,
            createdAt: message.createdAt,
            isOwnMessage: isSender,
            isMasterView: isMaster,
          });
        }

        if (result.flagged) {
          socket.emit("hateshield:warning", {
            strikes: newStrikes,
            maxStrikes: MAX_STRIKES_BEFORE_BAN,
            labels: result.blurLabels,
            banned: newStatus === "BANNED",
            severity: "severe",
            message: `⚠️ Your message was blurred! (${result.blurLabels.join(', ')})`
          });

          await prisma.arenaMember.update({
            where: { id: memberId },
            data: { strikes: newStrikes, status: newStatus },
          });

          if (newStatus === "BANNED") {
            io.to(arenaId).emit("member:banned", { playerNumber: member.playerNumber });
            socket.emit("fatal:banned");
            socket.leave(arenaId);
          }
        }

        ack?.({ ok: true, severity: result.severity });
      } catch (err) {
        console.error(err);
        ack?.({ ok: false, error: "Server error sending message" });
      }
    });

    socket.on("message:blur", async ({ messageId }, ack) => {
      try {
        if (!socket.data.isMaster) {
          return ack?.({ ok: false, error: "Only the Master can do that" });
        }
        const { arenaId } = socket.data;
        if (!arenaId) return ack?.({ ok: false, error: "Not in an arena" });

        const message = await prisma.message.findUnique({ 
          where: { id: messageId },
          include: { member: true }
        });
        if (!message || message.arenaId !== arenaId) {
          return ack?.({ ok: false, error: "Message not found in this arena" });
        }

        const updated = await prisma.message.update({
          where: { id: messageId },
          data: { isBlurred: true },
        });

        const socketsInArena = await io.in(arenaId).fetchSockets();
        
        for (const s of socketsInArena) {
          const isSender = s.data.memberId === message.memberId;
          const isMaster = s.data.isMaster;
          const canSeeContent = isSender || isMaster;
          
          s.emit("message:updated", {
            id: updated.id,
            content: canSeeContent ? updated.content : null,
            imageUrl: canSeeContent ? updated.imageUrl : null,
            isBlurred: true,
            isOwnMessage: isSender,
            isMasterView: isMaster,
          });
        }

        ack?.({ ok: true });
      } catch (err) {
        console.error(err);
        ack?.({ ok: false, error: "Server error blurring message" });
      }
    });

    socket.on("disconnect", () => {
      // no-op
    });
  });

  const port = process.env.PORT || 3000;
  httpServer.listen(port, () => {
    console.log(`> Faceless running on http://localhost:${port}`);
  });
});
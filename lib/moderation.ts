/**
 * HateShield — Faceless's abuse-detection layer.
 *
 * Uses the TensorFlow.js "toxicity" model: a pretrained NLP classifier
 * trained on the Jigsaw/Conversation AI toxic-comments dataset (the same
 * lineage Google's Perspective API is built on). It scores text across
 * seven categories: toxicity, severe_toxicity, obscene, threat, insult,
 * identity_attack, sexual_explicit.
 *
 * We load it once per server process (cold start ~1-2s, then cached).
 */

import * as tf from "@tensorflow/tfjs";
import * as toxicity from "@tensorflow-models/toxicity";

const THRESHOLD = Number(process.env.TOXICITY_THRESHOLD ?? 0.85);

let modelPromise: ReturnType<typeof toxicity.load> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = tf.setBackend("cpu").then(() => tf.ready()).then(() => toxicity.load(THRESHOLD, []));
  }
  return modelPromise;
}

export interface ModerationResult {
  flagged: boolean;
  topScore: number;
  labels: string[]; // categories that tripped the threshold
}

export async function classifyMessage(text: string): Promise<ModerationResult> {
  // Empty/whitespace-only messages can't be toxic
  if (!text.trim()) {
    return { flagged: false, topScore: 0, labels: [] };
  }

  const model = await getModel();
  const predictions = await model.classify([text]);

  let topScore = 0;
  const labels: string[] = [];

  for (const p of predictions) {
    const result = p.results[0];
    const probability = result.probabilities[1]; // index 1 = "matches" probability
    if (result.match) {
      labels.push(p.label);
    }
    if (probability > topScore) topScore = probability;
  }

  return {
    flagged: labels.length > 0,
    topScore,
    labels,
  };
}

/**
 * Strike logic: on a flagged message, we blur it immediately and add a
 * strike to the sender. On the 3rd strike, the caller (socket server)
 * should ban the member.
 */
export const MAX_STRIKES_BEFORE_BAN = 3;

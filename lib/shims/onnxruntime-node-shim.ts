// Shim used to prevent webpack from traversing into `onnxruntime-node` when
// building client bundles. The real `onnxruntime-node` should only be used on
// server-side code (API routes, scripts, CLI). This shim throws at runtime if
// used in the browser, which helps catch accidental client usage early.

const MESSAGE = 'onnxruntime-node is unavailable in the browser. Import/use it only from server-side code.';

export const InferenceSession = {
  create: async () => {
    throw new Error(MESSAGE);
  }
};

export class Tensor {
  constructor() {
    throw new Error(MESSAGE);
  }
}

export default {
  InferenceSession,
  Tensor,
};

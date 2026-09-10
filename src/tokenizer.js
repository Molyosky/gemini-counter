// Lightweight token estimator
// GPT-style: ~4 chars per token on average for English
// Gemini uses SentencePiece but this is a good approximation
window.estimateTokens = function(text) {
  if (!text) return 0;
  // More accurate: count words * 1.3 + punctuation
  const words = text.trim().split(/\s+/).length;
  const chars = text.length;
  // Blend word-based and char-based estimates
  return Math.ceil((words * 1.3 + chars / 4) / 2);
};

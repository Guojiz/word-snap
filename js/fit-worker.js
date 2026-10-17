/*
 * Runs the review engine's personal fit off the main thread.
 * In: { log, theta }. Out: the fitTheta() result ({ theta, loss, n, fitted }).
 */
/* global importScripts, WordSnapEngine */
importScripts("engine.js");

self.onmessage = event => {
  const { log, theta } = event.data || {};
  let result;
  try {
    result = WordSnapEngine.fitTheta(Array.isArray(log) ? log : [], theta);
  } catch (error) {
    result = { fitted: false, error: String(error && error.message || error) };
  }
  self.postMessage(result);
};

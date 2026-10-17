# Three editions: open web and Android, closed paid iOS

Word Snap ships as an open-source, free **Web edition** with no on-device model, an open-source, free **Android edition** with an on-device model (released first), and later a closed-source, paid **iOS edition** built on Apple Intelligence with its own design. The web's in-browser model (WebLLM) is removed because the small models a browser can run were too weak (none up to 1.7B judged word meaning above chance in `tools/ai-eval.html`); the web keeps the learner's own API key.

## Consequences

- Shared logic stays plain JavaScript behind interfaces, so the iOS edition can swap in Apple Intelligence without changing features such as **Memory aids**.
- Anything the iOS edition needs to stay closed lives outside this repository.

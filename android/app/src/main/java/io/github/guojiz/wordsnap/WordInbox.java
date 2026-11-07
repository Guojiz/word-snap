package io.github.guojiz.wordsnap;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;

/**
 * Hand-over from the native side to the web app, which owns the word list (in WebView storage).
 * Words captured outside the app (text selection → "Add to Word Snap") and the action of a
 * launcher shortcut wait here until the web app takes them (WordSnapInbox.take()).
 */
final class WordInbox {
    private static final String PREFS = "word_inbox";
    private static final String WORDS = "words";
    private static final String ACTION = "action";

    private WordInbox() {}

    private static SharedPreferences prefs(Context context) {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    static synchronized void addWord(Context context, String word, String meaning) {
        JSONArray words = readWords(context);
        words.put(new JSONArray().put(word).put(meaning));
        prefs(context).edit().putString(WORDS, words.toString()).apply();
    }

    static synchronized int count(Context context) {
        return readWords(context).length();
    }

    /** "practice" or "add"; the latest one wins. */
    static void setAction(Context context, String action) {
        prefs(context).edit().putString(ACTION, action).apply();
    }

    /** Returns { words: [[word, meaning], …], action } and empties the inbox. */
    static synchronized String[] take(Context context) {
        SharedPreferences p = prefs(context);
        String words = readWords(context).toString();
        String action = p.getString(ACTION, "");
        p.edit().remove(WORDS).remove(ACTION).apply();
        return new String[] { words, action };
    }

    private static JSONArray readWords(Context context) {
        try {
            return new JSONArray(prefs(context).getString(WORDS, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}

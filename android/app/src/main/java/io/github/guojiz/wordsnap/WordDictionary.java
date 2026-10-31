package io.github.guojiz.wordsnap;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Offline English → 中文 lookup over the app's own word books (wordbooks/*.json, from ECDICT),
 * for words captured outside the app. The first book in index.json that has a word gives its
 * meaning, so the easiest level's short meaning wins. Inflected forms are tried as their base
 * (swayed → sway, studies → study).
 */
final class WordDictionary {
    /** A hit: the head word as the book spells it, its meaning and the book's name. */
    static final class Entry {
        final String word, meaning, book;
        Entry(String word, String meaning, String book) {
            this.word = word;
            this.meaning = meaning;
            this.book = book;
        }
    }

    private static volatile WordDictionary instance;
    private final Map<String, Entry> entries = new HashMap<>();

    /** Loads on first use (about 20k words; call off the main thread). */
    static WordDictionary get(Context context) throws Exception {
        WordDictionary d = instance;
        if (d == null) {
            synchronized (WordDictionary.class) {
                if (instance == null) instance = load(context);
                d = instance;
            }
        }
        return d;
    }

    private static WordDictionary load(Context context) throws Exception {
        WordDictionary d = new WordDictionary();
        JSONArray books = new JSONObject(read(context, "public/wordbooks/index.json")).getJSONArray("books");
        for (int i = 0; i < books.length(); i++) {
            JSONObject book = books.getJSONObject(i);
            String name = book.optString("zh", book.getString("id"));
            JSONArray words = new JSONObject(read(context, "public/wordbooks/" + book.getString("id") + ".json")).getJSONArray("words");
            for (int j = 0; j < words.length(); j++) {
                JSONArray pair = words.getJSONArray(j);
                String key = pair.getString(0).toLowerCase(Locale.ROOT);
                if (!d.entries.containsKey(key)) d.entries.put(key, new Entry(pair.getString(0), pair.getString(1), name));
            }
        }
        return d;
    }

    private static String read(Context context, String path) throws IOException {
        try (InputStream in = context.getAssets().open(path); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[1 << 15];
            int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return new String(out.toByteArray(), StandardCharsets.UTF_8);
        }
    }

    Entry lookup(String text) {
        for (String candidate : candidates(text.toLowerCase(Locale.ROOT))) {
            Entry e = entries.get(candidate);
            if (e != null) return e;
        }
        return null;
    }

    /** The word itself, then likely base forms. */
    static List<String> candidates(String w) {
        List<String> out = new ArrayList<>();
        out.add(w);
        int n = w.length();
        if (n > 4 && w.endsWith("ies")) out.add(w.substring(0, n - 3) + "y");
        if (n > 4 && w.endsWith("ied")) out.add(w.substring(0, n - 3) + "y");
        if (n > 3 && w.endsWith("es")) out.add(w.substring(0, n - 2));
        if (n > 3 && w.endsWith("s") && !w.endsWith("ss")) out.add(w.substring(0, n - 1));
        if (n > 4 && w.endsWith("ed")) {
            String stem = w.substring(0, n - 2);
            out.add(stem);
            out.add(stem + "e");
            if (stem.length() > 2 && stem.charAt(stem.length() - 1) == stem.charAt(stem.length() - 2)) out.add(stem.substring(0, stem.length() - 1));
        }
        if (n > 5 && w.endsWith("ing")) {
            String stem = w.substring(0, n - 3);
            out.add(stem);
            out.add(stem + "e");
            if (stem.length() > 2 && stem.charAt(stem.length() - 1) == stem.charAt(stem.length() - 2)) out.add(stem.substring(0, stem.length() - 1));
        }
        if (n > 4 && w.endsWith("er")) out.add(w.substring(0, n - 2));
        if (n > 5 && w.endsWith("est")) out.add(w.substring(0, n - 3));
        if (n > 4 && w.endsWith("ly")) out.add(w.substring(0, n - 2));
        return out;
    }
}

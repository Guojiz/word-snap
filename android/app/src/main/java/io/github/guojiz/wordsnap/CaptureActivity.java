package io.github.guojiz.wordsnap;

import android.app.Activity;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.ViewGroup;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import java.util.Locale;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * "加入 Word Snap" in any app's text-selection menu (ACTION_PROCESS_TEXT). A card slides up over
 * the app the learner is reading in, shows the word's meaning from the built-in word books
 * (offline), and one tap puts it in the inbox for the library (see WordInbox). The learner never
 * leaves what they were reading.
 */
public class CaptureActivity extends Activity {
    private static final Pattern WORD = Pattern.compile("[A-Za-z][A-Za-z'’-]*");
    private static final int[] CONFETTI = { 0xFFFFB4A2, 0xFFA8D8FF, 0xFFFFE27A, 0xFF9EEBC4, 0xFFD4C4FF };

    private boolean night;
    private int paper, ink, muted, line;
    private LinearLayout card;
    private TextView meaningView, sourceView;
    private EditText meaningInput;
    private Button addButton;
    private String word = "";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        night = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
        paper = night ? 0xFF2A2940 : 0xFFFFFCF6;
        ink = night ? 0xFFF7F5EE : 0xFF2B2A3D;
        muted = night ? 0xFFB9B7CC : 0xFF55546A;
        line = night ? 0xFF3A3954 : 0xFFEFE9DE;

        CharSequence selected = getIntent().getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT);
        String text = selected == null ? "" : selected.toString().trim();

        FrameLayout root = new FrameLayout(this);
        root.setOnClickListener(v -> finish()); // tap outside the card: cancel
        card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(22), dp(18), dp(22), dp(18));
        GradientDrawable bg = new GradientDrawable();
        bg.setColor(paper);
        bg.setCornerRadius(dp(26));
        bg.setStroke(dp(1), line);
        card.setBackground(bg);
        card.setClickable(true);
        card.setElevation(dp(12));
        FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        lp.setMargins(dp(12), 0, dp(12), dp(12));
        root.addView(card, lp);
        setContentView(root);
        // Edge to edge (Android 15+): keep the card above the navigation bar and the keyboard.
        ViewCompat.setOnApplyWindowInsetsListener(root, (v, insets) -> {
            Insets bars = insets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.ime());
            v.setPadding(0, bars.top, 0, bars.bottom);
            return WindowInsetsCompat.CONSUMED;
        });

        card.addView(confettiRow());
        card.addView(label(getString(R.string.capture_kicker), 13, muted, false), spaced(10));

        String picked = pickWord(text);
        if (picked == null) {
            card.addView(label(text.isEmpty() ? getString(R.string.capture_empty) : getString(R.string.capture_pick_word), 18, ink, true), spaced(8));
            card.addView(buttons(false), spaced(18));
            slideIn();
            return;
        }
        word = picked;
        TextView wordView = label(word, wordSize(word), ink, true);
        card.addView(wordView, spaced(4));
        meaningView = label(getString(R.string.capture_looking), 18, muted, false);
        card.addView(meaningView, spaced(6));
        sourceView = label("", 13, muted, false);
        sourceView.setVisibility(View.GONE);
        card.addView(sourceView, spaced(6));
        meaningInput = new EditText(this);
        meaningInput.setHint(getString(R.string.capture_meaning_hint));
        meaningInput.setTextColor(ink);
        meaningInput.setHintTextColor(muted);
        meaningInput.setTextSize(TypedValue.COMPLEX_UNIT_SP, 18);
        meaningInput.setInputType(InputType.TYPE_CLASS_TEXT);
        meaningInput.setImeOptions(EditorInfo.IME_ACTION_DONE);
        meaningInput.setOnEditorActionListener((v, actionId, event) -> { add(); return true; });
        meaningInput.setVisibility(View.GONE);
        card.addView(meaningInput, spaced(4));
        card.addView(buttons(true), spaced(18));
        addButton.setEnabled(false);
        slideIn();

        Handler main = new Handler(Looper.getMainLooper());
        Executors.newSingleThreadExecutor().execute(() -> {
            WordDictionary.Entry entry = null;
            try {
                entry = WordDictionary.get(getApplicationContext()).lookup(word);
            } catch (Exception ignored) {
                // no word books: type the meaning
            }
            WordDictionary.Entry found = entry;
            main.post(() -> showLookup(wordView, found));
        });
    }

    /** One English word or a short phrase (≤ 4 words) from the selection, or null. */
    static String pickWord(String text) {
        Matcher m = WORD.matcher(text);
        StringBuilder phrase = new StringBuilder();
        int count = 0;
        while (m.find()) {
            if (++count > 4) return null;
            if (phrase.length() > 0) phrase.append(' ');
            phrase.append(m.group().replaceAll("^['’-]+|['’-]+$", ""));
        }
        if (count == 0) return null;
        String s = phrase.toString();
        // A capitalised single word at a sentence start is still a word ("Swaying" → "swaying").
        if (count == 1 && s.length() > 1 && Character.isUpperCase(s.charAt(0)) && Character.isLowerCase(s.charAt(1))) {
            s = s.toLowerCase(Locale.ROOT);
        }
        return s;
    }

    /** Long words get smaller instead of breaking mid-word (photosynthesizing). */
    static int wordSize(String w) {
        int longest = 0;
        for (String part : w.split(" ")) longest = Math.max(longest, part.length());
        return longest <= 10 ? 34 : longest <= 14 ? 28 : 22;
    }

    private void showLookup(TextView wordView, WordDictionary.Entry entry) {
        if (isFinishing()) return;
        if (entry != null) {
            word = entry.word;
            wordView.setText(word);
            wordView.setTextSize(TypedValue.COMPLEX_UNIT_SP, wordSize(word));
            meaningView.setText(entry.meaning);
            meaningView.setTextColor(ink);
            sourceView.setText(getString(R.string.capture_from_book, entry.book));
            sourceView.setVisibility(View.VISIBLE);
        } else {
            meaningView.setText(getString(R.string.capture_not_found));
            meaningInput.setVisibility(View.VISIBLE);
            meaningInput.requestFocus();
        }
        addButton.setEnabled(true);
    }

    private void add() {
        String meaning = meaningInput.getVisibility() == View.VISIBLE
            ? meaningInput.getText().toString().trim()
            : meaningView.getText().toString();
        if (meaning.isEmpty()) {
            meaningInput.setError(getString(R.string.capture_need_meaning));
            return;
        }
        WordInbox.addWord(getApplicationContext(), word, meaning);
        addButton.setEnabled(false);
        addButton.setText(getString(R.string.capture_added));
        addButton.performHapticFeedback(HapticFeedbackConstants.CONFIRM);
        int waiting = WordInbox.count(getApplicationContext());
        sourceView.setText(waiting > 1 ? getString(R.string.capture_waiting_many, waiting) : getString(R.string.capture_waiting_one));
        sourceView.setVisibility(View.VISIBLE);
        card.animate().scaleX(1.03f).scaleY(1.03f).setDuration(120).withEndAction(() ->
            card.animate().scaleX(1f).scaleY(1f).setDuration(160).start()).start();
        new Handler(Looper.getMainLooper()).postDelayed(this::finish, 1100);
    }

    private LinearLayout buttons(boolean withAdd) {
        LinearLayout row = new LinearLayout(this);
        row.setGravity(Gravity.END | Gravity.CENTER_VERTICAL);
        Button cancel = button(getString(withAdd ? R.string.capture_cancel : R.string.capture_ok), Color.TRANSPARENT, muted);
        cancel.setOnClickListener(v -> finish());
        row.addView(cancel);
        if (withAdd) {
            addButton = button(getString(R.string.capture_add), 0xFFFFE27A, 0xFF2B2A3D);
            addButton.setOnClickListener(v -> add());
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.leftMargin = dp(8);
            row.addView(addButton, lp);
        }
        return row;
    }

    private Button button(String text, int fill, int color) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16);
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setTextColor(color);
        b.setMinHeight(dp(48));
        b.setPadding(dp(22), 0, dp(22), 0);
        b.setStateListAnimator(null);
        GradientDrawable g = new GradientDrawable();
        g.setColor(fill);
        g.setCornerRadius(dp(24));
        b.setBackground(g);
        return b;
    }

    /** Five confetti dots: the app's set colours. */
    private LinearLayout confettiRow() {
        LinearLayout row = new LinearLayout(this);
        for (int c : CONFETTI) {
            View dot = new View(this);
            GradientDrawable g = new GradientDrawable();
            g.setColor(c);
            g.setCornerRadius(dp(3));
            dot.setBackground(g);
            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(dp(18), dp(6));
            lp.rightMargin = dp(5);
            row.addView(dot, lp);
        }
        return row;
    }

    private TextView label(String text, int sp, int color, boolean bold) {
        TextView v = new TextView(this);
        v.setText(text);
        v.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        v.setTextColor(color);
        if (bold) v.setTypeface(Typeface.DEFAULT_BOLD);
        return v;
    }

    private LinearLayout.LayoutParams spaced(int topDp) {
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        lp.topMargin = dp(topDp);
        return lp;
    }

    private void slideIn() {
        card.setTranslationY(dp(220));
        card.animate().translationY(0).setDuration(220).start();
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}

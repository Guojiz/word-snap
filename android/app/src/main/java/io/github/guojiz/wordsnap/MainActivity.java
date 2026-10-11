package io.github.guojiz.wordsnap;

import android.os.Bundle;
import android.webkit.WebView;

import androidx.activity.EdgeToEdge;
import androidx.activity.OnBackPressedCallback;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.BridgeActivity;

import io.github.guojiz.wordsnap.habit.NativeHabitPlugin;

public class MainActivity extends BridgeActivity {
    /** Asks the web app to take one step back; true when it did (see js/shell.js). */
    private static final String BACK_JS =
        "(function(){try{return !!(window.wordSnapBack&&window.wordSnapBack());}catch(e){return false;}})()";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        // The system launch screen (AppTheme.NoActionBarLaunch) hands over to the web one.
        SplashScreen.installSplashScreen(this);
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(LlmPlugin.class);
        registerPlugin(NativeHabitPlugin.class);
        super.onCreate(savedInstanceState);
        // Draw behind the status and navigation bars; the page pads itself with the safe-area insets.
        EdgeToEdge.enable(this);

        // Back gesture / button: the web app walks its own screen stack (dialog, page, set,
        // onboarding step). At the first screen it says no, and the app goes to the background
        // like any Android app, keeping the set where it was.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                WebView webView = getBridge() != null ? getBridge().getWebView() : null;
                if (webView == null) {
                    moveTaskToBack(true);
                    return;
                }
                webView.evaluateJavascript(BACK_JS, handled -> {
                    if (!"true".equals(handled)) moveTaskToBack(true);
                });
            }
        });
    }
}

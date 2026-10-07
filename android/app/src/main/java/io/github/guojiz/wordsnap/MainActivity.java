package io.github.guojiz.wordsnap;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // App-local plugins must be registered before the bridge starts.
        registerPlugin(LlmPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

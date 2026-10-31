package io.github.guojiz.wordsnap;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** The web app's side of WordInbox: take() → { words: [[word, meaning], …], action }. */
@CapacitorPlugin(name = "WordSnapInbox")
public class InboxPlugin extends Plugin {
    @PluginMethod
    public void take(PluginCall call) {
        String[] taken = WordInbox.take(getContext());
        JSObject out = new JSObject();
        try {
            out.put("words", new JSArray(taken[0]));
        } catch (org.json.JSONException e) {
            out.put("words", new JSArray());
        }
        out.put("action", taken[1]);
        call.resolve(out);
    }
}

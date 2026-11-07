package io.github.guojiz.wordsnap;

import android.content.Intent;
import android.graphics.Color;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * The page's side of LiveActivity (Android 16 Live Updates).
 *   status()                         → { notify, promote }: may post, and shown as a Live Update
 *   showSet({ key, done, total, colors: ["#rrggbb", …], title, text }) → { shown }
 *   endSet()
 *   openSettings()                   the system page where the learner allows Live Updates
 */
@CapacitorPlugin(name = "WordSnapLive")
public class LivePlugin extends Plugin {
    @PluginMethod
    public void status(PluginCall call) {
        JSObject out = new JSObject();
        out.put("notify", LiveActivity.canNotify(getContext()));
        out.put("promote", LiveActivity.canPromote(getContext()));
        call.resolve(out);
    }

    @PluginMethod
    public void showSet(PluginCall call) {
        JSArray list = call.getArray("colors", new JSArray());
        int[] colors = new int[list.length()];
        for (int i = 0; i < colors.length; i++) {
            try {
                colors[i] = Color.parseColor(list.getString(i));
            } catch (Exception e) {
                colors[i] = 0xFF47B5FF;
            }
        }
        boolean shown = LiveActivity.showSet(getContext(),
            call.getString("key", ""),
            call.getInt("done", 0),
            call.getInt("total", 25),
            colors,
            call.getString("title", "Word Snap"),
            call.getString("text", ""));
        call.resolve(new JSObject().put("shown", shown));
    }

    @PluginMethod
    public void endSet(PluginCall call) {
        LiveActivity.endSet(getContext());
        call.resolve();
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent intent;
        if (android.os.Build.VERSION.SDK_INT >= 36) {
            intent = new Intent("android.settings.MANAGE_APP_PROMOTED_NOTIFICATIONS");
        } else {
            intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        }
        intent.putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(intent);
        } catch (Exception e) {
            Intent fallback = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName())
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(fallback);
        }
        call.resolve();
    }
}

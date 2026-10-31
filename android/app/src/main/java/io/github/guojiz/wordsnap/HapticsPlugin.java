package io.github.guojiz.wordsnap;

import android.content.Context;
import android.os.Build;
import android.os.VibrationAttributes;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * Rich haptics for the game feel: each moment has its own texture, built from the vibrator's
 * primitives (click, tick, thud, rise, spin) where the phone supports them, else from a
 * waveform with amplitudes, else a plain buzz. play({ name, level }) — level 0..1 scales a
 * match with the combo. Short taps use the touch usage; the long celebrations (set complete,
 * igniting the day's flame, a promotion) use the media usage so they are felt like the
 * animation they go with. The web side decides whether effects are on (Settings).
 */
@CapacitorPlugin(name = "WordSnapHaptics")
public class HapticsPlugin extends Plugin {
    private static final int CLICK = VibrationEffect.Composition.PRIMITIVE_CLICK;
    private static final int TICK = VibrationEffect.Composition.PRIMITIVE_TICK;
    private static final int THUD = VibrationEffect.Composition.PRIMITIVE_THUD;
    private static final int SPIN = VibrationEffect.Composition.PRIMITIVE_SPIN;
    private static final int QUICK_RISE = VibrationEffect.Composition.PRIMITIVE_QUICK_RISE;
    private static final int SLOW_RISE = VibrationEffect.Composition.PRIMITIVE_SLOW_RISE;
    private static final int QUICK_FALL = VibrationEffect.Composition.PRIMITIVE_QUICK_FALL;
    private static final int LOW_TICK = VibrationEffect.Composition.PRIMITIVE_LOW_TICK;

    private Vibrator vibrator() {
        Context c = getContext();
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager vm = (VibratorManager) c.getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            return vm != null ? vm.getDefaultVibrator() : null;
        }
        return (Vibrator) c.getSystemService(Context.VIBRATOR_SERVICE);
    }

    @PluginMethod
    public void play(PluginCall call) {
        String name = call.getString("name", "tap");
        double level = Math.max(0, Math.min(1, call.getDouble("level", 0.0)));
        Vibrator v = vibrator();
        if (v == null || !v.hasVibrator()) {
            call.resolve();
            return;
        }
        boolean longOne = name.equals("setComplete") || name.equals("ignite") || name.equals("levelUp") || name.equals("goalDone");
        VibrationEffect effect = null;
        if (Build.VERSION.SDK_INT >= 30) effect = composed(v, name, (float) level);
        if (effect == null) effect = waveform(v, name, level);
        try {
            if (Build.VERSION.SDK_INT >= 33) {
                v.vibrate(effect, VibrationAttributes.createForUsage(longOne ? VibrationAttributes.USAGE_MEDIA : VibrationAttributes.USAGE_TOUCH));
            } else {
                v.vibrate(effect);
            }
        } catch (RuntimeException ignored) {
            // vibrator busy or not allowed
        }
        call.resolve();
    }

    /** Primitive compositions; null when the phone lacks one of the primitives used. */
    private VibrationEffect composed(Vibrator v, String name, float level) {
        int[] all = { CLICK, TICK, THUD, SPIN, QUICK_RISE, SLOW_RISE, QUICK_FALL, LOW_TICK };
        if (!v.areAllPrimitivesSupported(all)) return null;
        VibrationEffect.Composition c = VibrationEffect.startComposition();
        switch (name) {
            case "select": c.addPrimitive(TICK, 0.55f); break;
            case "match":
                // Firmer as the combo grows.
                c.addPrimitive(CLICK, 0.55f + 0.45f * level).addPrimitive(TICK, 0.35f + 0.4f * level, 45);
                break;
            case "combo":
                c.addPrimitive(QUICK_RISE, 0.6f).addPrimitive(CLICK, 1f, 50)
                    .addPrimitive(TICK, 0.7f, 55).addPrimitive(TICK, 0.9f, 55);
                break;
            case "wrong": c.addPrimitive(THUD, 0.9f).addPrimitive(LOW_TICK, 0.7f, 90).addPrimitive(QUICK_FALL, 0.5f, 40); break;
            case "claim": // a coin dropping into the jar
                c.addPrimitive(CLICK, 0.8f).addPrimitive(CLICK, 1f, 95).addPrimitive(TICK, 0.5f, 70).addPrimitive(TICK, 0.3f, 60);
                break;
            case "setComplete":
                c.addPrimitive(TICK, 0.5f).addPrimitive(TICK, 0.7f, 75).addPrimitive(TICK, 0.9f, 75)
                    .addPrimitive(CLICK, 1f, 75).addPrimitive(SPIN, 0.7f, 110);
                break;
            case "goalDone":
                c.addPrimitive(QUICK_RISE, 0.7f).addPrimitive(CLICK, 1f, 40).addPrimitive(SPIN, 0.8f, 90)
                    .addPrimitive(TICK, 0.8f, 120).addPrimitive(TICK, 0.6f, 90).addPrimitive(TICK, 0.4f, 90);
                break;
            case "ignite": // the flame catches: building rise, the whoomph, then sparks settling
                c.addPrimitive(SLOW_RISE, 0.35f).addPrimitive(SLOW_RISE, 0.6f, 60).addPrimitive(QUICK_RISE, 0.9f, 80)
                    .addPrimitive(THUD, 1f, 30).addPrimitive(SPIN, 0.9f, 40)
                    .addPrimitive(TICK, 0.8f, 140).addPrimitive(TICK, 0.6f, 110).addPrimitive(TICK, 0.45f, 120)
                    .addPrimitive(TICK, 0.3f, 140).addPrimitive(LOW_TICK, 0.25f, 160);
                break;
            case "commit": c.addPrimitive(THUD, 1f).addPrimitive(CLICK, 1f, 35); break;
            case "levelUp":
                c.addPrimitive(QUICK_RISE, 0.8f).addPrimitive(CLICK, 1f, 40).addPrimitive(SPIN, 0.8f, 80)
                    .addPrimitive(CLICK, 1f, 130).addPrimitive(TICK, 0.7f, 80).addPrimitive(TICK, 0.5f, 80).addPrimitive(TICK, 0.3f, 80);
                break;
            case "swipe": c.addPrimitive(LOW_TICK, 0.25f + 0.6f * level); break;
            default: c.addPrimitive(CLICK, 0.5f); // tap
        }
        return c.compose();
    }

    /** Waveform fallback: [off, on, off, on …] in ms with amplitudes 0..255. */
    private VibrationEffect waveform(Vibrator v, String name, double level) {
        long[] t;
        int[] a;
        switch (name) {
            case "select": t = new long[] { 0, 6 }; a = new int[] { 0, 90 }; break;
            case "match": t = new long[] { 0, 10 }; a = new int[] { 0, (int) (120 + 135 * level) }; break;
            case "combo": t = new long[] { 0, 12, 40, 12, 40, 24 }; a = new int[] { 0, 160, 0, 200, 0, 255 }; break;
            case "wrong": t = new long[] { 0, 20, 50, 20 }; a = new int[] { 0, 255, 0, 150 }; break;
            case "claim": t = new long[] { 0, 10, 80, 14, 60, 6 }; a = new int[] { 0, 200, 0, 255, 0, 90 }; break;
            case "setComplete": case "goalDone": case "levelUp":
                t = new long[] { 0, 10, 60, 10, 60, 14, 60, 40 }; a = new int[] { 0, 120, 0, 170, 0, 220, 0, 255 }; break;
            case "ignite":
                t = new long[] { 0, 120, 0, 120, 30, 60, 120, 8, 110, 8, 120, 6 }; a = new int[] { 0, 60, 120, 200, 0, 255, 0, 160, 0, 110, 0, 70 }; break;
            case "commit": t = new long[] { 0, 30, 30, 12 }; a = new int[] { 0, 255, 0, 220 }; break;
            case "swipe": t = new long[] { 0, 5 }; a = new int[] { 0, (int) (60 + 150 * level) }; break;
            default: t = new long[] { 0, 8 }; a = new int[] { 0, 150 };
        }
        if (!v.hasAmplitudeControl()) return VibrationEffect.createWaveform(t, -1);
        return VibrationEffect.createWaveform(t, a, -1);
    }
}

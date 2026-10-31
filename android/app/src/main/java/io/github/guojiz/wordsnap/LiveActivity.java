package io.github.guojiz.wordsnap;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import java.util.ArrayList;
import java.util.List;

/**
 * Android 16 Live Updates (promoted ongoing notifications with ProgressStyle and a status bar
 * chip), kept to what the guidelines allow: activities the learner started, in progress, with a
 * clear end. Two of them:
 *  - a practice set left half-way (chip "12/25", the set's confetti lane as segments; tapping
 *    returns to the board; gone when the app is back, the set ends, or after 30 minutes);
 *  - the on-device model download (chip "63%").
 * Older Android versions get the same as an ordinary progress notification.
 * A set's card that the learner swipes away is not posted again for that set.
 */
final class LiveActivity {
    static final String CHANNEL = "live";
    static final int SET_ID = 7300;
    static final int DOWNLOAD_ID = 7301;
    private static final String PREFS = "live_activity";
    private static final String DISMISSED_SET = "dismissed_set";
    private static final String ACTION_DISMISSED = "io.github.guojiz.wordsnap.LIVE_DISMISSED";
    private static final long SET_TIMEOUT_MS = 30 * 60 * 1000;

    private LiveActivity() {}

    static boolean canNotify(Context context) {
        if (Build.VERSION.SDK_INT >= 33
            && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return false;
        }
        return NotificationManagerCompat.from(context).areNotificationsEnabled();
    }

    /** Whether the system shows them as Live Updates (the learner can switch it off per app). */
    static boolean canPromote(Context context) {
        if (Build.VERSION.SDK_INT < 36) return false;
        try {
            return context.getSystemService(NotificationManager.class).canPostPromotedNotifications();
        } catch (Throwable e) {
            return false; // API 36.0 builds without Live Updates
        }
    }

    private static void ensureChannel(Context context) {
        NotificationManager nm = context.getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, context.getString(R.string.live_channel), NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(context.getString(R.string.live_channel_about));
        channel.setSound(null, null);
        channel.enableVibration(false);
        channel.setShowBadge(false);
        nm.createNotificationChannel(channel);
    }

    private static PendingIntent openApp(Context context) {
        Intent intent = new Intent(context, MainActivity.class)
            .setAction(Intent.ACTION_VIEW)
            .setData(android.net.Uri.parse("wordsnap://resume"))
            .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        return PendingIntent.getActivity(context, 0, intent, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    private static NotificationCompat.Builder base(Context context, String title, String text, String chip) {
        ensureChannel(context);
        return new NotificationCompat.Builder(context, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_word_snap)
            .setContentTitle(title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setShowWhen(false)
            .setCategory(NotificationCompat.CATEGORY_PROGRESS)
            .setRequestPromotedOngoing(true)
            .setShortCriticalText(chip)
            .setContentIntent(openApp(context));
    }

    /**
     * A set left half-way. colors: one ARGB per answered match (the set's confetti lane).
     * Returns false when it was not posted (no permission, or this set's card was swiped away).
     */
    static boolean showSet(Context context, String setKey, int done, int total, int[] colors, String title, String text) {
        if (!canNotify(context) || total <= 0) return false;
        if (setKey.equals(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(DISMISSED_SET, ""))) return false;
        List<NotificationCompat.ProgressStyle.Segment> segments = new ArrayList<>();
        for (int i = 0; i < total; i++) {
            NotificationCompat.ProgressStyle.Segment s = new NotificationCompat.ProgressStyle.Segment(1);
            if (i < colors.length) s.setColor(colors[i]);
            segments.add(s);
        }
        NotificationCompat.ProgressStyle style = new NotificationCompat.ProgressStyle()
            .setStyledByProgress(true)
            .setProgressSegments(segments)
            .setProgress(Math.min(done, total));
        Intent dismissed = new Intent(context, DismissReceiver.class).setAction(ACTION_DISMISSED).putExtra("set", setKey);
        NotificationCompat.Builder b = base(context, title, text, done + "/" + total)
            .setStyle(style)
            .setProgress(total, Math.min(done, total), false) // older Android: a plain bar
            .setTimeoutAfter(SET_TIMEOUT_MS)
            .setDeleteIntent(PendingIntent.getBroadcast(context, SET_ID, dismissed, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT));
        post(context, SET_ID, b);
        return true;
    }

    static void endSet(Context context) {
        NotificationManagerCompat.from(context).cancel(SET_ID);
    }

    /** The model download; fraction 0..1. */
    static void showDownload(Context context, String modelName, long bytes, long total) {
        if (!canNotify(context) || total <= 0) return;
        int pct = (int) Math.min(100, bytes * 100 / total);
        String text = String.format(java.util.Locale.ROOT, "%.1f / %.1f GB", bytes / 1e9, total / 1e9);
        NotificationCompat.ProgressStyle style = new NotificationCompat.ProgressStyle()
            .setStyledByProgress(true)
            .addProgressSegment(new NotificationCompat.ProgressStyle.Segment(100).setColor(0xFF47B5FF))
            .setProgress(pct);
        NotificationCompat.Builder b = base(context, context.getString(R.string.live_download_title, modelName), text, pct + "%")
            .setStyle(style)
            .setProgress(100, pct, false);
        post(context, DOWNLOAD_ID, b);
    }

    static void endDownload(Context context) {
        NotificationManagerCompat.from(context).cancel(DOWNLOAD_ID);
    }

    @SuppressWarnings("MissingPermission") // checked in canNotify()
    private static void post(Context context, int id, NotificationCompat.Builder b) {
        try {
            NotificationManagerCompat.from(context).notify(id, b.build());
        } catch (SecurityException ignored) {
            // permission withdrawn meanwhile
        }
    }

    /** Remembers which set's card was swiped away, so it is not posted again for that set. */
    public static class DismissReceiver extends BroadcastReceiver {
        @Override
        public void onReceive(Context context, Intent intent) {
            String set = intent.getStringExtra("set");
            if (set != null) context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(DISMISSED_SET, set).apply();
        }
    }
}

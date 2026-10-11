package io.github.guojiz.wordsnap.habit

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import io.github.guojiz.wordsnap.R
import kotlin.math.abs

/**
 * The two nudges the app sends by itself, both off until the learner turns them on
 * in Settings, and never once today's goal is done:
 *
 *  - streak: 9 pm, when a day streak is at stake and today's goal is still open;
 *  - due:    5:30 pm, when 10 or more words are due for review.
 *
 * The daily reminder at the learner's own time stays with @capacitor/local-notifications;
 * a nudge close to it is skipped so the phone never buzzes twice for the same thing.
 * Alarms are inexact (no exact-alarm permission) and are set again after a reboot,
 * an app update or a clock change. A 4 am alarm turns the widget over to the new day.
 */
internal object Nudges {
    const val ACTION_STREAK = "io.github.guojiz.wordsnap.NUDGE_STREAK"
    const val ACTION_DUE = "io.github.guojiz.wordsnap.NUDGE_DUE"
    const val ACTION_NEW_DAY = "io.github.guojiz.wordsnap.NEW_DAY"

    private const val CHANNEL_STREAK = "nudge_streak"
    private const val CHANNEL_DUE = "nudge_due"
    private const val ID_STREAK = 7200
    private const val ID_DUE = 7201

    private const val STREAK_HOUR = 21
    private const val STREAK_MINUTE = 0
    private const val DUE_HOUR = 17
    private const val DUE_MINUTE = 30
    private const val DUE_MIN_WORDS = 10
    /** A nudge this close to the daily reminder is left to the reminder. */
    private const val REMINDER_GAP_MIN = 60

    fun schedule(context: Context, now: Long = System.currentTimeMillis()) {
        val snapshot = HabitStore.load(context)
        val alarms = context.getSystemService(AlarmManager::class.java) ?: return
        fun set(action: String, at: Long?, wake: Boolean) {
            val pi = pending(context, action)
            alarms.cancel(pi)
            if (at == null) return
            if (wake) alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
            else alarms.set(AlarmManager.RTC, at, pi)
        }
        val on = snapshot != null && snapshot.active
        set(ACTION_STREAK, if (on && snapshot!!.nudgeStreak) Days.next(now, STREAK_HOUR, STREAK_MINUTE) else null, true)
        set(ACTION_DUE, if (on && snapshot!!.nudgeDue) Days.next(now, DUE_HOUR, DUE_MINUTE) else null, true)
        // Just after 4 am the widget starts the new day; no need to wake the phone for it.
        set(ACTION_NEW_DAY, if (on) Days.next(now, 4, 1) else null, false)
    }

    /** Today's goal is done: take back any nudge still in the shade. */
    fun clearShown(context: Context) {
        NotificationManagerCompat.from(context).apply {
            cancel(ID_STREAK)
            cancel(ID_DUE)
        }
    }

    fun fire(context: Context, action: String, now: Long = System.currentTimeMillis()) {
        val (snapshot, today) = HabitStore.today(context, now)
        if (snapshot == null || !today.active || today.done) return
        val res = context.inAppLanguage(snapshot.lang)
        val r = res.resources
        when (action) {
            ACTION_STREAK -> {
                if (!snapshot.nudgeStreak || today.streak < 1 || nearReminder(snapshot, STREAK_HOUR, STREAK_MINUTE)) return
                val title = r.getQuantityString(R.plurals.nudge_streak_title, today.streak, today.streak)
                val body = if (today.left > 0)
                    r.getQuantityString(R.plurals.nudge_streak_body, today.left, today.left, today.minutes)
                else res.getString(R.string.nudge_streak_body_set)
                post(context, res, CHANNEL_STREAK, ID_STREAK, title, body)
            }
            ACTION_DUE -> {
                if (!snapshot.nudgeDue || today.dueLeft < DUE_MIN_WORDS || nearReminder(snapshot, DUE_HOUR, DUE_MINUTE)) return
                val title = r.getQuantityString(R.plurals.nudge_due_title, today.dueLeft, today.dueLeft)
                val body = res.getString(R.string.nudge_due_body, today.minutes)
                post(context, res, CHANNEL_DUE, ID_DUE, title, body)
            }
        }
    }

    private fun nearReminder(snapshot: Snapshot, hour: Int, minute: Int): Boolean {
        val reminder = Days.minutesOf(snapshot.reminder) ?: return false
        return abs(reminder - (hour * 60 + minute)) < REMINDER_GAP_MIN
    }

    private fun post(context: Context, res: Context, channel: String, id: Int, title: String, body: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return
        ensureChannels(context, res)
        val notification = NotificationCompat.Builder(context, channel)
            .setSmallIcon(R.drawable.ic_stat_word_snap)
            .setColor(ContextCompat.getColor(context, R.color.notification_accent))
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(TodayWidget.openApp(context))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        try {
            NotificationManagerCompat.from(context).notify(id, notification)
        } catch (e: SecurityException) {
            // Permission withdrawn between the check and the post: nothing to send.
        }
    }

    /** Channel names follow the app language at the time they are first shown or renamed. */
    private fun ensureChannels(context: Context, res: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = context.getSystemService(NotificationManager::class.java) ?: return
        manager.createNotificationChannel(NotificationChannel(
            CHANNEL_STREAK, res.getString(R.string.channel_streak), NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = res.getString(R.string.channel_streak_desc) })
        manager.createNotificationChannel(NotificationChannel(
            CHANNEL_DUE, res.getString(R.string.channel_due), NotificationManager.IMPORTANCE_DEFAULT,
        ).apply { description = res.getString(R.string.channel_due_desc) })
    }

    private fun pending(context: Context, action: String): PendingIntent {
        val intent = Intent(context, NudgeReceiver::class.java).setAction(action)
        return PendingIntent.getBroadcast(context, action.hashCode(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
    }
}

/** Alarms, plus the system events after which alarms have to be set again. */
class NudgeReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        if (action == Nudges.ACTION_STREAK || action == Nudges.ACTION_DUE) Nudges.fire(context, action)
        TodayWidget.refreshAll(context)
        Nudges.schedule(context)
    }
}

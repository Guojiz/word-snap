package io.github.guojiz.wordsnap.habit

import org.json.JSONException
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone
import kotlin.math.max
import kotlin.math.roundToInt

/** Habit days run from 4 am to 4 am local time, exactly as js/habit.js counts them. */
internal object Days {
    const val DAY_MS = 86_400_000L
    private const val CUTOFF_MS = 4 * 3_600_000L

    fun key(ts: Long): Long {
        val local = Calendar.getInstance().apply { timeInMillis = ts - CUTOFF_MS }
        val utc = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply {
            clear()
            set(local.get(Calendar.YEAR), local.get(Calendar.MONTH), local.get(Calendar.DAY_OF_MONTH))
        }
        return Math.floorDiv(utc.timeInMillis, DAY_MS)
    }

    /** The next local hour:minute after [now]. */
    fun next(now: Long, hour: Int, minute: Int): Long {
        val c = Calendar.getInstance().apply {
            timeInMillis = now
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        if (c.timeInMillis <= now) c.add(Calendar.DAY_OF_MONTH, 1)
        return c.timeInMillis
    }

    /** Minutes since midnight of an "HH:MM" string, or null. */
    fun minutesOf(time: String): Int? {
        val m = Regex("^(\\d\\d):(\\d\\d)$").find(time) ?: return null
        return m.groupValues[1].toInt() * 60 + m.groupValues[2].toInt()
    }
}

/** What the home screen shows at one moment. */
internal data class Today(
    val active: Boolean,
    val done: Boolean = false,
    val streak: Int = 0,
    val dueLeft: Int = 0,
    val newLeft: Int = 0,
    val minutes: Int = 0,
    /** 0..1, how much of today's goal is behind the learner. */
    val progress: Float = 0f,
) {
    val left get() = dueLeft + newLeft
}

/**
 * The web app's snapshot (js/native-habit.js): today's goal and streak when it was
 * sent, plus the streak and due times for the coming week if nothing more is practised.
 */
internal class Snapshot(
    val at: Long,
    val lang: String,
    val active: Boolean,
    val day: Long,
    val done: Boolean,
    val streak: Int,
    val dueLeft: Int,
    val newLeft: Int,
    val minutes: Int,
    val pairMs: Double,
    val newPerDay: Int,
    val idle: IntArray,
    val due: LongArray,
    val nudgeStreak: Boolean,
    val nudgeDue: Boolean,
    val reminder: String,
) {
    /** Words due at [ts]: the due times are sorted. */
    fun dueBy(ts: Long): Int {
        var lo = 0
        var hi = due.size
        while (lo < hi) {
            val mid = (lo + hi) ushr 1
            if (due[mid] <= ts) lo = mid + 1 else hi = mid
        }
        return lo
    }

    private fun minutesFor(dueWords: Int, newWords: Int): Int =
        max(1, ((dueWords * 1.3 + newWords * 3) * pairMs / 60_000).roundToInt())

    /** Today as of [now]; [peakLeft] is the most work today has asked for (for the progress bar). */
    fun today(now: Long, peakLeft: Int): Today {
        if (!active) return Today(active = false)
        val offset = Days.key(now) - day
        if (offset <= 0) {
            if (done) return Today(true, done = true, streak = streak, progress = 1f)
            // Words that fell due since the snapshot was taken.
            val dueNow = dueLeft + max(0, dueBy(now) - dueBy(at))
            val left = dueNow + newLeft
            val peak = max(peakLeft, left)
            return Today(
                true, false, streak, dueNow, newLeft,
                if (dueNow == dueLeft) minutes else minutesFor(dueNow, newLeft),
                if (peak > 0) 1f - left.toFloat() / peak else 0f,
            )
        }
        val dueNow = dueBy(now)
        return Today(
            true, false, idle.getOrElse(offset.toInt()) { 0 }, dueNow, newPerDay,
            minutesFor(dueNow, newPerDay), 0f,
        )
    }

    companion object {
        fun parse(json: String?): Snapshot? {
            if (json.isNullOrEmpty()) return null
            return try {
                val o = JSONObject(json)
                val nudges = o.optJSONObject("nudges")
                val idle = o.optJSONArray("idle")
                val due = o.optJSONArray("due")
                Snapshot(
                    at = o.optLong("at"),
                    lang = if (o.optString("lang") == "en") "en" else "zh",
                    active = o.optBoolean("active"),
                    day = o.optLong("day"),
                    done = o.optBoolean("done"),
                    streak = o.optInt("streak"),
                    dueLeft = o.optInt("dueLeft"),
                    newLeft = o.optInt("newLeft"),
                    minutes = o.optInt("minutes"),
                    pairMs = o.optDouble("pairMs", 5000.0).takeIf { it > 0 } ?: 5000.0,
                    newPerDay = o.optInt("newPerDay"),
                    idle = IntArray(idle?.length() ?: 0) { idle!!.optInt(it) },
                    due = LongArray(due?.length() ?: 0) { due!!.optLong(it) }.also { it.sort() },
                    nudgeStreak = nudges?.optBoolean("streak") == true,
                    nudgeDue = nudges?.optBoolean("due") == true,
                    reminder = o.optString("reminder"),
                )
            } catch (e: JSONException) {
                null
            }
        }
    }
}

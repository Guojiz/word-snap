package io.github.guojiz.wordsnap.habit

import android.content.Context
import android.content.res.Configuration
import java.util.Locale
import kotlin.math.max

/** The last snapshot from the web app, kept for the widget and the nudges. */
internal object HabitStore {
    private const val PREFS = "word_snap_habit"
    private const val KEY_SNAPSHOT = "snapshot"
    private const val KEY_PEAK_DAY = "peak_day"
    private const val KEY_PEAK_LEFT = "peak_left"

    private fun prefs(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(context: Context): Snapshot? = Snapshot.parse(prefs(context).getString(KEY_SNAPSHOT, null))

    /** Saves a snapshot; returns it parsed, or null when it was not valid. */
    fun save(context: Context, json: String): Snapshot? {
        val snapshot = Snapshot.parse(json) ?: return null
        val p = prefs(context)
        val left = if (snapshot.active && !snapshot.done) snapshot.dueLeft + snapshot.newLeft else 0
        // The progress bar measures against the most work today has asked for.
        val peak = if (p.getLong(KEY_PEAK_DAY, -1) == snapshot.day) max(p.getInt(KEY_PEAK_LEFT, 0), left) else left
        p.edit()
            .putString(KEY_SNAPSHOT, json)
            .putLong(KEY_PEAK_DAY, snapshot.day)
            .putInt(KEY_PEAK_LEFT, peak)
            .apply()
        return snapshot
    }

    fun today(context: Context, now: Long = System.currentTimeMillis()): Pair<Snapshot?, Today> {
        val snapshot = load(context) ?: return null to Today(active = false)
        val peak = if (prefs(context).getLong(KEY_PEAK_DAY, -1) == snapshot.day) prefs(context).getInt(KEY_PEAK_LEFT, 0) else 0
        return snapshot to snapshot.today(now, peak)
    }
}

/** Strings in the language the learner picked in the app (EN / 中), not the phone's. */
internal fun Context.inAppLanguage(lang: String?): Context {
    if (lang == null) return this
    val config = Configuration(resources.configuration)
    config.setLocale(Locale.forLanguageTag(lang))
    return createConfigurationContext(config)
}

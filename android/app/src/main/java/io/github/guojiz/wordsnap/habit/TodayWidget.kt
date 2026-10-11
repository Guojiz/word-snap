package io.github.guojiz.wordsnap.habit

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.SizeF
import android.view.View
import android.widget.RemoteViews
import io.github.guojiz.wordsnap.MainActivity
import io.github.guojiz.wordsnap.R
import kotlin.math.roundToInt

/**
 * Home-screen widget: today's goal and the day streak, in the Confetti Cards look
 * (DESIGN.md, Home-screen widget). Two sizes: a 2×2 square, and a wide one that adds
 * the review / new-word cards. Tapping it opens the app on its start screen.
 */
class TodayWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
        ids.forEach { update(context, manager, it) }
        Nudges.schedule(context)
    }

    override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: Bundle) {
        update(context, manager, id)
    }

    companion object {
        private const val WIDE_MIN_DP = 220

        fun refreshAll(context: Context) {
            val manager = AppWidgetManager.getInstance(context) ?: return
            manager.getAppWidgetIds(ComponentName(context, TodayWidget::class.java)).forEach { update(context, manager, it) }
        }

        private fun update(context: Context, manager: AppWidgetManager, id: Int) {
            val (snapshot, today) = HabitStore.today(context)
            val res = context.inAppLanguage(snapshot?.lang)
            val views = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                RemoteViews(mapOf(
                    SizeF(100f, 100f) to build(context, res, today, wide = false),
                    SizeF(WIDE_MIN_DP.toFloat(), 100f) to build(context, res, today, wide = true),
                ))
            } else {
                val width = manager.getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH)
                build(context, res, today, wide = width >= WIDE_MIN_DP)
            }
            manager.updateAppWidget(id, views)
        }

        private fun build(context: Context, res: Context, today: Today, wide: Boolean): RemoteViews {
            val v = RemoteViews(context.packageName, if (wide) R.layout.widget_today_wide else R.layout.widget_today_small)
            val streakText = res.resources.getQuantityString(R.plurals.widget_streak, today.streak, today.streak)

            // Streak chip: grey until today's goal is done, then ember (as in the app).
            v.setViewVisibility(R.id.streak_lit, if (today.active && today.done) View.VISIBLE else View.GONE)
            v.setViewVisibility(R.id.streak_dim, if (today.active && !today.done) View.VISIBLE else View.GONE)
            v.setTextViewText(R.id.streak_lit_text, today.streak.toString())
            v.setTextViewText(R.id.streak_dim_text, today.streak.toString())
            v.setContentDescription(R.id.streak_lit, streakText)
            v.setContentDescription(R.id.streak_dim, streakText)

            val counting = today.active && !today.done && today.left > 0
            v.setViewVisibility(R.id.row_count, if (counting) View.VISIBLE else View.GONE)
            v.setViewVisibility(R.id.row_title, if (counting) View.GONE else View.VISIBLE)
            val caption: String
            val summary: String
            when {
                counting -> {
                    v.setTextViewText(R.id.count, today.left.toString())
                    v.setTextViewText(R.id.count_unit, res.resources.getQuantityString(R.plurals.widget_words_left, today.left))
                    val minutes = res.getString(R.string.widget_minutes, today.minutes)
                    caption = if (wide) minutes else res.getString(R.string.widget_breakdown, minutes, today.dueLeft, today.newLeft)
                    summary = res.resources.getQuantityString(R.plurals.widget_words_left_full, today.left, today.left) + ", " + minutes
                }
                today.done -> {
                    v.setImageViewResource(R.id.title_badge, R.drawable.widget_badge_done)
                    v.setTextViewText(R.id.title, res.getString(R.string.widget_done))
                    caption = if (today.streak > 0) res.getString(R.string.widget_done_streak, streakText) else res.getString(R.string.widget_done_sub)
                    summary = res.getString(R.string.widget_done) + ", " + caption
                }
                today.active -> {
                    v.setImageViewResource(R.id.title_badge, R.drawable.widget_badge_play)
                    v.setTextViewText(R.id.title, res.getString(R.string.widget_play))
                    caption = res.getString(R.string.widget_play_sub)
                    summary = res.getString(R.string.widget_play)
                }
                else -> {
                    v.setImageViewResource(R.id.title_badge, R.drawable.widget_badge_play)
                    v.setTextViewText(R.id.title, res.getString(R.string.widget_start))
                    caption = res.getString(R.string.widget_start_sub)
                    summary = res.getString(R.string.widget_start)
                }
            }
            v.setTextViewText(R.id.caption, caption)
            v.setViewVisibility(R.id.progress, if (today.active) View.VISIBLE else View.GONE)
            v.setProgressBar(R.id.progress, 100, (today.progress * 100).roundToInt().coerceIn(0, 100), false)

            if (wide) {
                val mark = res.getString(R.string.widget_card_done)
                v.setTextViewText(R.id.card_review_label, res.getString(R.string.widget_card_review))
                v.setTextViewText(R.id.card_new_label, res.getString(R.string.widget_card_new))
                v.setTextViewText(R.id.card_review_value, when { !today.active -> "–"; today.done -> mark; else -> today.dueLeft.toString() })
                v.setTextViewText(R.id.card_new_value, when { !today.active -> "–"; today.done -> mark; else -> today.newLeft.toString() })
            }

            v.setContentDescription(android.R.id.background,
                if (today.active && today.streak > 0 && !today.done) "$summary. $streakText" else summary)
            v.setOnClickPendingIntent(android.R.id.background, openApp(context))
            return v
        }

        internal fun openApp(context: Context): PendingIntent {
            val intent = Intent(context, MainActivity::class.java)
                .setAction(Intent.ACTION_MAIN)
                .addCategory(Intent.CATEGORY_LAUNCHER)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            return PendingIntent.getActivity(context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
        }
    }
}

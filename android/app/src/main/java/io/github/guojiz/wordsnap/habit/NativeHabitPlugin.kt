package io.github.guojiz.wordsnap.habit

import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

/** The web app's bridge to the widget and the nudges: `NativeHabit.sync({ snapshot })`. */
@CapacitorPlugin(name = "NativeHabit")
class NativeHabitPlugin : Plugin() {
    @PluginMethod
    fun sync(call: PluginCall) {
        val json = call.getObject("snapshot")?.toString()
        val snapshot = json?.let { HabitStore.save(context, it) }
        if (snapshot == null) {
            call.reject("snapshot missing or invalid")
            return
        }
        if (snapshot.active && snapshot.done) Nudges.clearShown(context)
        TodayWidget.refreshAll(context)
        Nudges.schedule(context)
        call.resolve()
    }
}

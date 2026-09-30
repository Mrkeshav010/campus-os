import { Fragment } from 'react'

export const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const groups = [
  ['before_lunch', 'Before lunch'],
  ['after_lunch', 'After lunch'],
]

export default function TimetableGrid({ slots, onDelete }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full min-w-[760px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-28 border-b bg-slate-50 p-2 text-left text-xs text-slate-500">Time</th>
            {DAYS.map((d) => (
              <th key={d} className="border-b border-l bg-slate-50 p-2 text-xs text-slate-500">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(([key, label], gi) => {
            const inGroup = slots.filter((s) => s.session === key)
            const times = [...new Set(inGroup.map((s) => `${s.startTime}-${s.endTime}`))].sort()
            return (
              <Fragment key={key}>
                {gi === 1 && (
                  <tr>
                    <td colSpan={7} className="bg-amber-50 p-2 text-center text-xs font-medium text-amber-700">
                      Lunch break
                    </td>
                  </tr>
                )}
                <tr>
                  <td colSpan={7} className="bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {label}
                  </td>
                </tr>
                {times.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-3 text-center text-xs text-slate-400">
                      No classes
                    </td>
                  </tr>
                )}
                {times.map((t) => (
                  <tr key={t}>
                    <td className="border-t p-2 text-xs font-medium text-slate-600">{t.replace('-', ' – ')}</td>
                    {DAYS.map((d) => {
                      const cell = inGroup.filter((s) => s.day === d && `${s.startTime}-${s.endTime}` === t)
                      return (
                        <td key={d} className="border-l border-t p-1 align-top">
                          {cell.map((s) => (
                            <div key={s._id} className="mb-1 rounded-lg bg-emerald-50 p-2 text-xs">
                              <div className="font-semibold text-emerald-800">{s.subject}</div>
                              {s.teacherName && <div className="text-slate-600">{s.teacherName}</div>}
                              {s.room && <div className="text-slate-400">Room {s.room}</div>}
                              {onDelete && (
                                <button onClick={() => onDelete(s)} className="mt-1 text-[11px] text-red-600 hover:underline">
                                  Remove
                                </button>
                              )}
                            </div>
                          ))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
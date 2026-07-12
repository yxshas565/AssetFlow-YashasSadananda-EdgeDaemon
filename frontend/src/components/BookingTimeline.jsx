import { useApi } from "../api/useApi";
import "./BookingTimeline.css";

// Simple 24h-wide visual strip per day showing existing bookings for one resource,
// so a user can see overlaps before they even submit the form.
export default function BookingTimeline({ resourceId, resourceName }) {
  const { data, loading } = useApi(`/bookings?resource_id=${resourceId}&limit=50`);
  const bookings = (data?.items ?? []).filter((b) => b.status !== "CANCELLED");

  if (loading) return null;
  if (bookings.length === 0) {
    return (
      <div className="surface timeline-wrap">
        <p className="muted">No active bookings for {resourceName} — fully open.</p>
      </div>
    );
  }

  // Group by calendar day (local) for a readable strip-per-day layout
  const byDay = {};
  bookings.forEach((b) => {
    const day = new Date(b.start_ts).toDateString();
    (byDay[day] ??= []).push(b);
  });

  const dayToPercent = (ts, dayStart) => {
    const diffMs = new Date(ts) - dayStart;
    return Math.max(0, Math.min(100, (diffMs / (24 * 60 * 60 * 1000)) * 100));
  };

  return (
    <div className="surface timeline-wrap">
      <h3>Existing bookings — {resourceName}</h3>
      {Object.entries(byDay).map(([day, items]) => {
        const dayStart = new Date(day);
        return (
          <div key={day} className="timeline-day">
            <span className="timeline-day-label">{day}</span>
            <div className="timeline-track">
              {items.map((b) => {
  const left = dayToPercent(b.start_ts, dayStart);
  const right = dayToPercent(b.end_ts, dayStart);
  const startLabel = new Date(b.start_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endLabel = new Date(b.end_ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div
      key={b.id}
      className={`timeline-block timeline-${b.status.toLowerCase()}`}
      style={{ left: `${left}%`, width: `${Math.max(right - left, 8)}%` }}
      title={`${startLabel} - ${endLabel} (${b.status})`}
    >
      <span className="timeline-block-label">{startLabel}–{endLabel}</span>
    </div>
  );
})}
            </div>
          </div>
        );
      })}
    </div>
  );
}
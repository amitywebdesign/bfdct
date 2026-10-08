import site from "./site.json" with { type: "json" };
import apparatus from "./apparatus.json" with { type: "json" };

// Years of service counts from the September 24 organizational meeting.
function yearsOfService(now = new Date()) {
  const { year, month, day } = site.founded;
  let years = now.getFullYear() - year;
  const before = now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day);
  if (before) years -= 1;
  return years;
}

export default function () {
  const active = apparatus.units.filter((u) => !u.retired);
  const vehicles = active.filter((u) => !["trailer", "utv"].includes(u.category));
  return {
    _note: "Facts we can stand behind at launch. Add callVolume and members here when the chief has numbers (see docs/HOW-TO-UPDATE.md).",
    years: yearsOfService(),
    stations: 3,
    vehicles: vehicles.length,
    extras: "plus a hazmat trailer and a UTV",
    sponsors: "~40",
    callVolume: null,
    members: null,
  };
}

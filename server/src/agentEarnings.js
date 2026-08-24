// What a B2B agent actually earns on a trip.
//
// There is no commission. TripGuru does not pay the agent a percentage of the
// sale -- the agent is shown a cost, adds his own markup on top of it, and
// keeps that markup. So his earnings are simply the markup portion of the
// total his client pays.
//
// On the agent portal the markup is applied last (GST is charged on TripGuru's
// price and the markup goes on top of the GST-inclusive figure), so the total
// is cost x (1 + pct/100) and the markup portion works back out of the stored
// total exactly:
//
//     markup = total x pct / (100 + pct)
//
// Deriving it from total_price and markup_percent -- both of which have always
// been stored -- means this is correct for every booking ever made, including
// the ones written while the flat 10% commission was still being recorded.
//
// This lives in one module on purpose. The old AGENT_COMMISSION_RATE was
// declared separately in routes/bookings.js and routes/quotes.js, so changing
// one left the two disagreeing about what the same trip was worth.
function agentEarnings(totalPrice, markupPercent) {
  const total = Number(totalPrice) || 0;
  const pct = Number(markupPercent) || 0;
  if (total <= 0 || pct <= 0) return 0;
  return Math.round((total * pct) / (100 + pct));
}

module.exports = { agentEarnings };

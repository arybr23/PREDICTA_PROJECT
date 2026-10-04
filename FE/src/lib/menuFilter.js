/**
 * Menu search.
 *
 * Pulled out of the component so the matching rule can be checked directly —
 * the cashier's search box is the only way to find an item on a long menu, and
 * "it looked fine in the browser" is not a test.
 *
 * Matches the display name or the item id, so both "teh" and "P08" work.
 */
export function filterMenuItems(items = [], query = "") {
  // `?? ""` rather than a default parameter: String(null) is "null", which would
  // search for the literal word instead of returning everything.
  const needle = String(query ?? "").trim().toLowerCase();
  if (!needle) return items;

  return items.filter((item) => {
    const name = String(item?.name ?? "").toLowerCase();
    const id = String(item?.item_id ?? "").toLowerCase();
    return name.includes(needle) || id.includes(needle);
  });
}

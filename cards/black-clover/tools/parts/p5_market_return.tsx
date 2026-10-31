  return (
    <Frame className="bc-market-panel" pad="0 0 8px">
      <SectionHead art="market_head" icon="coins" title="Market" sub="Buy, Sell, and Trade in the Kingdom." />
      {buyError ? <div role="alert" className="bc-inv-msg" style={{ color: "#efb6a5" }}>{buyError}</div> : null}
      {stock.length ? (
        <div className="bc-stock">
          <div className="bc-stock-title">Currently browsing</div>
          {stock.map(function (item, i) {
            var afford = num(v.money, 0) >= num(item.price, 0);
            return (
              <div key={item.id || i} className="bc-stockrow">
                <div><strong>{str(item.name) + (num(item.qty, 1) > 1 ? " ×" + num(item.qty, 1) : "")}</strong>{item.notes ? <small>{str(item.notes)}</small> : null}</div>
                <Btn small disabled={busy || !afford} onClick={function () { buyItem(item, i); }}>{num(item.price, 0).toLocaleString() + " Yul"}</Btn>
              </div>
            );
          })}
        </div>
      ) : null}
      <div className="bc-actrows">
        <ActionRow icon="search" title="Look for a shop" sub={shops.length ? "Known: " + shops.slice(0, 3).map(function (l) { return str(l.name); }).join(", ") : "Browse what is nearby."} disabled={busy} onClick={function () { ask("I look for somewhere nearby to buy what I need."); }} />
        <ActionRow icon="coins" title="Sell something" sub="Turn your items into Yul." disabled={busy} onClick={function () { ask("I try to sell something I'm carrying."); }} />
        <ActionRow icon="people" title="Ask around discreetly" sub={shady.length ? "Leads: " + shady.slice(0, 2).map(function (x) { return str(x.name || x.topic); }).join(", ") : "Find rare items and special deals through local connections."} disabled={busy} onClick={function () { ask("I quietly ask around about where someone could buy things off the books."); }} />
      </div>
    </Frame>
  );
}

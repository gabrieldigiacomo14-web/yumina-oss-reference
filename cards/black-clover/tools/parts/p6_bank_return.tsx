  var md = React.useState(""); var mode = md[0], setMode = md[1];
  var acctLabel = bank.open ? (bank.accountType && bank.accountType !== "personal" ? bank.accountType : "Stored in the Clover Kingdom Treasury.") : "No account opened yet.";
  function amountBox(kind) {
    return (
      <div className="bc-bank-amount">
        <input className="bc-in" inputMode="numeric" type="number" min="1" step="1" aria-label={kind === "deposit" ? "Amount to deposit" : "Amount to withdraw"} value={amount} onChange={function (e) { setAmount(e.target.value); }} placeholder="Whole Yul" />
        <Btn small kind="gold" disabled={!ready || !here || !bank.open || !(Number(amount) > 0)} onClick={function () { transfer(kind, Number(amount)); }}>{kind === "deposit" ? "Deposit" : "Withdraw"}</Btn>
        {kind === "deposit" ? <Btn small disabled={!ready || !here || !bank.open || wallet.yul <= 0} onClick={function () { transfer('deposit', wallet.yul); }}>All cash</Btn> : null}
      </div>
    );
  }
  return (
    <Frame className="bc-bank-panel" pad="0 0 8px">
      <SectionHead art="bank_head" icon="bank" title="Bank & Treasury" sub="Safekeep your wealth." />
      <div className="bc-balance">
        <img src={img("bank_balance")} alt="" /><span className="bc-balance-shade" />
        <div><small>Account Balance</small><strong>{num(bank.balance, 0).toLocaleString() + " Yul"}</strong><span>{acctLabel}</span></div>
      </div>
      <div className="bc-note bc-bank-where" style={{ color: here ? C.goldHi : C.muted }}>{here ? "A staffed counter is here: deposits and withdrawals are open." : "Transactions need a visit to a staffed bank or treasury office."}</div>
      {here && !bank.open ? <div style={{ padding: "0 10px 8px" }}><Btn kind="gold" disabled={!ready} onClick={open}>Open a free account</Btn></div> : null}
      <div className="bc-actrows">
        <ActionRow icon="up" title="Deposit Yul" sub="Move Yul from your purse to the bank." expanded={mode === "deposit"} onClick={function () { setMode(mode === "deposit" ? "" : "deposit"); }} />
        {mode === "deposit" ? amountBox("deposit") : null}
        <ActionRow icon="down" title="Withdraw Yul" sub="Take Yul from your bank to your purse." expanded={mode === "withdraw"} onClick={function () { setMode(mode === "withdraw" ? "" : "withdraw"); }} />
        {mode === "withdraw" ? amountBox("withdraw") : null}
        <ActionRow icon="doc" title="Account Details" sub="View history and treasury information." expanded={mode === "details"} onClick={function () { setMode(mode === "details" ? "" : "details"); }} />
        {mode === "details" ? (
          <div className="bc-bank-details">
            <Row k="Purse · spendable cash" v={bcMoney(v.money)} />
            <Row k="Purse weight" v={wallet.weightKg.toFixed(3) + ' kg (' + wallet.pieces + ' pieces)'} />
            <Row k="Account" v={bank.open ? 'Active' : 'Not opened'} />
            {bank.ledger.length ? bank.ledger.slice(-12).reverse().map(function (e, i) { return <Row key={e.id || i} k={str(e.kind) + ' · ' + str(e.at)} v={(e.kind === 'withdraw' ? '-' : '+') + bcMoney(e.amount)} />; }) : <Empty>No banking transactions have been recorded.</Empty>}
            <Btn small disabled={!!api.isStreaming} onClick={function () { send(api, "I ask where the nearest reputable banking or treasury office is and how to reach it."); p.toStory(); }}>Ask where to bank (AI)</Btn>
            <div className="bc-note">Knight salary and approved awards credit this account automatically. Opening and transfers are local and use no AI.</div>
          </div>
        ) : null}
      </div>
      {msg ? <div role="status" className="bc-inv-msg">{msg}</div> : null}
    </Frame>
  );
}

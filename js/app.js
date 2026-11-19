(function () {
    const KEY = 'sdlc-parking-demo-v1';
    let lot;
    try { const s = localStorage.getItem(KEY); lot = s ? new ParkingLot(JSON.parse(s)) : seedLot(); } catch (e) { lot = seedLot(); }
    let isAdmin = false;
    let lastSlot = null;

    const $ = (id) => document.getElementById(id);
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(lot.snapshot())); } catch (e) {} };
    const money = (n) => 'Tk ' + n.toFixed(2);
    const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const peakTag = (p) => p ? '<span class="tag">PEAK</span>' : '<span class="tag tag--off">OFF-PEAK</span>';

    function show(el, kind, text) { el.hidden = false; el.className = 'msg ' + kind; el.textContent = text; }

    function renderStats() {
        $('sAvail').textContent = lot.available;
        $('sOcc').textContent = lot.occupied;
        $('sUse').textContent = lot.usage + '%';
        $('sMeter').style.width = lot.usage + '%';
        $('sTotal').textContent = TOTAL_SLOTS;
    }

    function renderLot() {
        const map = lot.slotMap();
        const box = $('lot'); box.innerHTML = '';
        for (let i = 1; i <= TOTAL_SLOTS; i++) {
            const v = map[i];
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'slot' + (v ? ' is-busy' : '') + (i === lastSlot ? ' is-new' : '');
            b.textContent = 'A-' + i;
            b.setAttribute('aria-label', 'Slot A-' + i + (v ? ', occupied' : ', available'));
            b.dataset.slot = i;
            b.addEventListener('click', () => {
                $('slotInfo').textContent = v
                    ? `A-${i} is occupied by a ${TYPE_NAMES[v.type]} (owner ${v.owner}), in since ${v.entry}.`
                    : `A-${i} is available.`;
            });
            box.appendChild(b);
        }
        lastSlot = null;
    }

    function renderAdmin() {
        $('adminLogin').hidden = isAdmin;
        $('adminArea').hidden = !isAdmin;
        if (!isAdmin) return;
        const rows = lot.vehicles.filter(v => v.parked).map(v =>
            `<tr><td>${esc(v.id)}</td><td>${esc(v.owner)}</td><td>${TYPE_NAMES[v.type]}</td><td>A-${v.slot}</td><td>${v.entry}</td><td>${peakTag(isPeakHour(v.entry))}</td></tr>`).join('');
        $('parkedBody').innerHTML = rows || '';
        $('parkedEmpty').hidden = !!rows;
        $('parkedTable').hidden = !rows;
        const r = lot.report();
        $('rCheckouts').textContent = r.checkouts;
        $('rRevenue').textContent = money(r.revenue);
        $('rParked').textContent = r.parked;
        $('rAvail').textContent = r.available;
        $('rUsage').textContent = r.usage + '%';
        const bills = lot.bills.slice().reverse().map(b =>
            `<tr><td>${esc(b.id)}</td><td>${esc(b.owner)}</td><td>${b.duration} h</td><td>${money(b.amount)}</td></tr>`).join('');
        $('billBody').innerHTML = bills;
    }

    function renderAll() { renderStats(); renderLot(); renderAdmin(); }

    // Tabs
    function tabs(root) {
        const btns = root.querySelectorAll('[role=tab]');
        btns.forEach(btn => btn.addEventListener('click', () => {
            btns.forEach(b => { b.setAttribute('aria-selected', b === btn); document.getElementById(b.dataset.panel).hidden = b !== btn; });
        }));
    }
    document.querySelectorAll('.tabs').forEach(tabs);

    // Check-in
    $('inForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const res = lot.checkIn({ id: f.get('id'), type: f.get('type'), owner: f.get('owner'), entry: f.get('entry') });
        if (!res.ok) { show($('inMsg'), 'err', res.error); return; }
        save(); lastSlot = res.slot; renderAll();
        show($('inMsg'), 'ok', `Check-in successful. Assigned slot A-${res.slot} at ${res.entry}. Peak hour: ${res.peak ? 'YES (08:00-10:00 or 17:00-20:00)' : 'NO'}.`);
        e.target.reset(); e.target.elements.type.value = '1';
    });

    // Check-out
    $('outForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const res = lot.checkOut(f.get('id'), f.get('exit'));
        $('receipt').hidden = true;
        if (!res.ok) { show($('outMsg'), 'err', res.error); return; }
        save(); renderAll();
        const b = res.bill;
        $('outMsg').hidden = true;
        $('receipt').hidden = false;
        $('receipt').innerHTML =
            `<div><span>Vehicle ID</span><span>${esc(b.id)}</span></div>
             <div><span>Owner</span><span>${esc(b.owner)}</span></div>
             <div><span>Type</span><span>${TYPE_NAMES[b.type]}</span></div>
             <div><span>Slot</span><span>A-${b.slot}</span></div>
             <div><span>Entry</span><span>${b.entry}${b.entryPeak ? ' (Peak)' : ''}</span></div>
             <div><span>Exit</span><span>${b.exit}${b.exitPeak ? ' (Peak)' : ''}</span></div>
             <div><span>Duration</span><span>${b.duration} hour${b.duration > 1 ? 's' : ''}</span></div>
             <div class="total"><span>Parking fee</span><span>${money(b.amount)}</span></div>`;
        e.target.reset();
    });

    // Admin login / logout
    $('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        if (f.get('user') === ADMIN_USER && f.get('pass') === ADMIN_PASS) {
            isAdmin = true; $('loginMsg').hidden = true; e.target.reset(); renderAdmin();
        } else show($('loginMsg'), 'err', 'Invalid credentials! Try again.');
    });
    $('logout').addEventListener('click', () => { isAdmin = false; renderAdmin(); });

    // Search
    $('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const res = lot.search(new FormData(e.target).get('id'));
        const box = $('searchOut');
        if (!res.ok) { box.hidden = true; show($('searchMsg'), 'err', res.error); return; }
        $('searchMsg').hidden = true; box.hidden = false;
        const v = res.vehicle;
        box.innerHTML =
            `<div><span>Vehicle ID</span><span>${esc(v.id)}</span></div><div><span>Owner</span><span>${esc(v.owner)}</span></div>
             <div><span>Type</span><span>${TYPE_NAMES[v.type]}</span></div><div><span>Slot</span><span>A-${v.slot}</span></div>
             <div><span>Entry</span><span>${v.entry}</span></div><div><span>Peak entry</span><span>${res.peak ? 'YES' : 'NO'}</span></div>
             <div><span>Status</span><span>Parked</span></div>`;
    });

    // Update ID
    $('updateForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const res = lot.updateId(f.get('oldId'), f.get('newId'));
        if (!res.ok) { show($('updateMsg'), 'err', res.error); return; }
        save(); renderAll();
        show($('updateMsg'), 'ok', `Vehicle ID updated. Old ID: ${res.oldId}, New ID: ${res.newId}.`);
        e.target.reset();
    });

    // Reset demo
    $('reset').addEventListener('click', () => { lot = seedLot(); save(); isAdmin = false; renderAll();
        ['inMsg', 'outMsg', 'searchMsg', 'updateMsg'].forEach(i => $(i).hidden = true); $('receipt').hidden = true; $('searchOut').hidden = true; });

    renderAll();
})();

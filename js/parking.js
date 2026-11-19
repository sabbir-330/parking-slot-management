// Parking logic: a direct port of SDLC_main.c (same rules, same numbers).
// 50 slots, first free slot is assigned, Tk 100 per started hour (minimum 1 hour),
// same-day parking only, peak hours 08:00-10:00 and 17:00-20:00.

const TOTAL_SLOTS = 50;
const RATE_PER_HOUR = 100;
const ADMIN_USER = 'admin';
const ADMIN_PASS = '1234';
const TYPE_NAMES = { 1: 'Car', 2: 'Bike', 3: 'Truck' };

function validTime(t) {
    const m = /^(\d{1,2}):(\d{1,2})$/.exec(String(t).trim());
    if (!m) return false;
    const h = +m[1], mi = +m[2];
    return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

function toMinutes(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

function isPeakHour(t) {
    const h = parseInt(t, 10);
    return (h >= 8 && h < 10) || (h >= 17 && h < 20);
}

function calculateFee(type, hours) {
    return RATE_PER_HOUR * hours;
}

class ParkingLot {
    constructor(snapshot) {
        this.vehicles = [];   // every vehicle ever checked in (like vehicles[] in C)
        this.bills = [];
        if (snapshot) {
            this.vehicles = snapshot.vehicles || [];
            this.bills = snapshot.bills || [];
        }
    }

    get occupied() { return this.vehicles.filter(v => v.parked).length; }
    get available() { return TOTAL_SLOTS - this.occupied; }
    get usage() { return Math.floor((this.occupied * 100) / TOTAL_SLOTS); }
    get revenue() { return this.bills.reduce((s, b) => s + b.amount, 0); }

    findParked(id) { return this.vehicles.find(v => v.id === id && v.parked); }

    slotMap() {
        const map = {};
        this.vehicles.forEach(v => { if (v.parked) map[v.slot] = v; });
        return map;
    }

    findAvailableSlot() {
        const map = this.slotMap();
        for (let i = 1; i <= TOTAL_SLOTS; i++) if (!map[i]) return i;
        return -1;
    }

    checkIn({ id, type, owner, entry }) {
        id = (id || '').trim(); owner = (owner || '').trim();
        if (this.occupied >= TOTAL_SLOTS) return { ok: false, error: 'Sorry! Parking is full.' };
        if (!id) return { ok: false, error: 'Please enter a Vehicle ID.' };
        if (this.findParked(id)) return { ok: false, error: 'This vehicle is already parked!' };
        if (![1, 2, 3].includes(+type)) return { ok: false, error: 'Invalid vehicle type.' };
        if (!owner) return { ok: false, error: 'Please enter the owner name.' };
        if (!validTime(entry)) return { ok: false, error: 'Invalid time! Enter again (e.g., 10:30).' };
        const slot = this.findAvailableSlot();
        if (slot === -1) return { ok: false, error: 'Error: No slot available!' };
        this.vehicles.push({ id, owner, type: +type, slot, entry, parked: true });
        return { ok: true, slot, entry, peak: isPeakHour(entry) };
    }

    checkOut(id, exit) {
        id = (id || '').trim();
        const v = this.findParked(id);
        if (!v) return { ok: false, error: 'Vehicle not found or already checked out!' };
        if (!validTime(exit)) return { ok: false, error: 'Invalid time format! Enter again (e.g., 14:30).' };
        const minutes = toMinutes(exit) - toMinutes(v.entry);
        if (minutes < 0) return { ok: false, error: `Error! Exit time (${exit}) cannot be before entry time (${v.entry}). This system supports same-day parking only.` };
        let hours = Math.floor(minutes / 60);
        if (minutes % 60 > 0) hours++;
        if (hours === 0) hours = 1;
        const fee = calculateFee(v.type, hours);
        const bill = { id: v.id, owner: v.owner, type: v.type, slot: v.slot, entry: v.entry, exit, duration: hours, amount: fee,
                       entryPeak: isPeakHour(v.entry), exitPeak: isPeakHour(exit) };
        this.bills.push(bill);
        v.parked = false;
        return { ok: true, bill };
    }

    search(id) {
        const v = this.findParked((id || '').trim());
        return v ? { ok: true, vehicle: v, peak: isPeakHour(v.entry) } : { ok: false, error: 'Vehicle not found!' };
    }

    updateId(oldId, newId) {
        oldId = (oldId || '').trim(); newId = (newId || '').trim();
        const v = this.findParked(oldId);
        if (!v) return { ok: false, error: 'Error! Vehicle not found or already checked out!' };
        if (!newId) return { ok: false, error: 'Please enter the new Vehicle ID.' };
        if (this.findParked(newId)) return { ok: false, error: 'Error! This Vehicle ID already exists in the system!' };
        v.id = newId;
        return { ok: true, oldId, newId };
    }

    report() {
        return { checkouts: this.bills.length, revenue: this.revenue, parked: this.occupied,
                 available: this.available, usage: this.usage };
    }

    snapshot() { return { vehicles: this.vehicles, bills: this.bills }; }
}

// Starting data is the same as parking_data.txt in the repository.
function seedLot() {
    const lot = new ParkingLot();
    lot.vehicles = [
        { id: '1', owner: 'A', type: 1, slot: 1, entry: '03:00', parked: true },
        { id: '2', owner: 'B', type: 2, slot: 2, entry: '03:01', parked: true },
        { id: '3', owner: 'C', type: 3, slot: 3, entry: '03:02', parked: true },
        { id: '4', owner: 'D', type: 1, slot: 4, entry: '03:03', parked: false },
    ];
    lot.bills = [{ id: '4', owner: 'D', type: 1, slot: 4, entry: '03:03', exit: '04:03', duration: 1, amount: 100, entryPeak: false, exitPeak: false }];
    return lot;
}

if (typeof module !== 'undefined') module.exports = { ParkingLot, seedLot, validTime, isPeakHour, calculateFee, TOTAL_SLOTS };

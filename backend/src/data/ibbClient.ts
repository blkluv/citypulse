// IBB (Istanbul Metropolitan Municipality) Open Data API Client
// Fetches real Istanbul traffic, transit, incident, and parking data with caching

interface IBBTrafficIndex {
  trafficIndex: number;       // 1-99 (1=open, 99=very congested)
  timestamp: string;          // ISO date
  congestion: number;         // normalized 0-1 (trafficIndex/100)
}

interface IBBBusPosition {
  id: string;                 // KapiNo
  plate: string;              // Plaka
  lat: number;                // Enlem
  lng: number;                // Boylam
  speed: number;              // Hiz
  time: string;               // Saat
  operator: string;
  garage: string;
}

interface IBBIncident {
  id: number;
  title: string;
  type: string;               // "Kaza Bildirimi", "Bakim-Onarim Calismasi", etc.
  lat: number;
  lng: number;
  startTime: string;
  endTime: string | null;
  closedLanes: number;
}

interface IBBParking {
  id: number;
  name: string;
  lat: number;
  lng: number;
  capacity: number;
  emptyCapacity: number;
  occupancyRate: number;      // 0-1
  isOpen: boolean;
  district: string;
  parkType: string;
}

class IBBDataClient {
  private cache: Map<string, { data: unknown; fetchedAt: number }> = new Map();
  private defaultTTL = 5 * 60 * 1000; // 5 minutes

  // Check cache validity
  private getCached<T>(key: string, ttl?: number): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.fetchedAt > (ttl || this.defaultTTL)) return null;
    return cached.data as T;
  }

  // Get stale cached data (ignores TTL) — used as fallback when API is down
  private getStaleCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, fetchedAt: Date.now() });
  }

  // 1. Traffic Index (real-time, 1-min cache)
  async getTrafficIndex(): Promise<IBBTrafficIndex[]> {
    const cached = this.getCached<IBBTrafficIndex[]>("trafficIndex", 60_000);
    if (cached) return cached;

    try {
      const res = await fetch(
        "https://api.ibb.gov.tr/tkmservices/api/TrafficData/v1/TrafficIndexHistory/1/H",
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const result: IBBTrafficIndex[] = (Array.isArray(data) ? data : []).map(
        (item: Record<string, unknown>) => ({
          trafficIndex: (item.TrafficIndex as number) || 0,
          timestamp: (item.TrafficIndexDate as string) || "",
          congestion: Math.min(1, ((item.TrafficIndex as number) || 0) / 100),
        }),
      );

      this.setCache("trafficIndex", result);
      return result;
    } catch (err) {
      console.error("[IBB] Traffic index fetch failed:", err);
      const stale = this.getStaleCached<IBBTrafficIndex[]>("trafficIndex");
      if (stale) {
        console.log("[IBB] Returning stale cached traffic index data");
        return stale;
      }
      return [];
    }
  }

  // 2. IETT Bus Positions (SOAP, 2-min cache)
  async getBusPositions(): Promise<IBBBusPosition[]> {
    const cached = this.getCached<IBBBusPosition[]>("busPositions", 120_000);
    if (cached) return cached;

    try {
      const soapEnvelope = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope" xmlns:tns="http://tempuri.org/">
  <soap12:Header>
    <tns:AuthHeader>
      <tns:Username></tns:Username>
      <tns:Password></tns:Password>
    </tns:AuthHeader>
  </soap12:Header>
  <soap12:Body>
    <tns:GetFiloAracKonum_json />
  </soap12:Body>
</soap12:Envelope>`;

      const res = await fetch(
        "https://api.ibb.gov.tr/iett/FiloDurum/SeferGerceklesme.asmx",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/soap+xml; charset=utf-8",
          },
          body: soapEnvelope,
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!res.ok) throw new Error(`SOAP HTTP ${res.status}`);
      const text = await res.text();

      // Parse SOAP response — the JSON data is embedded in the XML response
      const jsonMatch = text.match(
        /<GetFiloAracKonum_jsonResult>(.*?)<\/GetFiloAracKonum_jsonResult>/s,
      );
      if (!jsonMatch) {
        // Fallback: look for a raw JSON array in the response
        const altMatch = text.match(/\[[\s\S]*?\]/);
        if (!altMatch) throw new Error("Could not parse SOAP response");
        const buses = JSON.parse(altMatch[0]);
        return this.parseBusData(buses);
      }

      // Decode HTML entities if present and parse JSON
      const jsonStr = jsonMatch[1]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");
      const buses = JSON.parse(jsonStr);
      return this.parseBusData(buses);
    } catch (err) {
      console.error("[IBB] Bus positions fetch failed:", err);
      const stale = this.getStaleCached<IBBBusPosition[]>("busPositions");
      if (stale) {
        console.log("[IBB] Returning stale cached bus positions");
        return stale;
      }
      return [];
    }
  }

  private parseBusData(buses: Record<string, unknown>[]): IBBBusPosition[] {
    const result: IBBBusPosition[] = buses
      .filter((b) => b.Enlem && b.Boylam)
      .slice(0, 200) // Cap at 200 for performance
      .map((b) => ({
        id:
          (b.KapiNo as string) ||
          `bus-${Math.random().toString(36).slice(2, 8)}`,
        plate: (b.Plaka as string) || "",
        lat: parseFloat(b.Enlem as string) || 0,
        lng: parseFloat(b.Boylam as string) || 0,
        speed: parseInt(b.Hiz as string, 10) || 0,
        time: (b.Saat as string) || "",
        operator: (b.Operator as string) || "",
        garage: (b.Garaj as string) || "",
      }))
      .filter(
        (b) =>
          b.lat > 40.5 && b.lat < 41.5 && b.lng > 28.5 && b.lng < 29.5,
      ); // Istanbul bounds filter

    this.setCache("busPositions", result);
    return result;
  }

  // 3. Traffic Incidents (CKAN, 5-min cache)
  async getTrafficIncidents(): Promise<IBBIncident[]> {
    const cached = this.getCached<IBBIncident[]>("incidents", 300_000);
    if (cached) return cached;

    try {
      const res = await fetch(
        "https://data.ibb.gov.tr/api/3/action/datastore_search?resource_id=1c043914-8a76-4793-bae9-c60a68c7d389&limit=50&sort=ANNOUNCEMENT_STARTING_DATETIME%20desc",
        { signal: AbortSignal.timeout(10_000) },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        success: boolean;
        result?: { records?: Record<string, unknown>[] };
      };

      if (!data.success || !data.result?.records) return [];

      const result: IBBIncident[] = data.result.records
        .filter(
          (r: Record<string, unknown>) => r.LATITUDE && r.LONGITUDE,
        )
        .map((r: Record<string, unknown>) => ({
          id: (r.ANNOUNCEMENT_ID as number) || (r._id as number),
          title: (r.ANNOUNCEMENT_TITLE as string) || "Unknown",
          type: (r.ANNOUNCEMENT_TYPE_DESC as string) || "Unknown",
          lat: parseFloat(r.LATITUDE as string),
          lng: parseFloat(r.LONGITUDE as string),
          startTime: (r.ANNOUNCEMENT_STARTING_DATETIME as string) || "",
          endTime: (r.ANNOUNCEMENT_ENDING_DATETIME as string) || null,
          closedLanes: parseInt(r.CLOSED_LANE as string, 10) || 0,
        }));

      this.setCache("incidents", result);
      return result;
    } catch (err) {
      console.error("[IBB] Incidents fetch failed:", err);
      const stale = this.getStaleCached<IBBIncident[]>("incidents");
      if (stale) {
        console.log("[IBB] Returning stale cached incidents");
        return stale;
      }
      return [];
    }
  }

  // 4. ISPARK Parking (REST, 3-min cache)
  async getParkingData(): Promise<IBBParking[]> {
    const cached = this.getCached<IBBParking[]>("parking", 180_000);
    if (cached) return cached;

    try {
      const res = await fetch("https://api.ibb.gov.tr/ispark/Park", {
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const result: IBBParking[] = (Array.isArray(data) ? data : [])
        .filter((p: Record<string, unknown>) => p.lat && p.lng)
        .map((p: Record<string, unknown>) => ({
          id: p.parkID as number,
          name: (p.parkName as string) || "",
          lat: parseFloat(p.lat as string),
          lng: parseFloat(p.lng as string),
          capacity: (p.capacity as number) || 0,
          emptyCapacity: (p.emptyCapacity as number) || 0,
          occupancyRate:
            (p.capacity as number) > 0
              ? 1 - ((p.emptyCapacity as number) || 0) / (p.capacity as number)
              : 0,
          isOpen: p.isOpen === 1,
          district: (p.district as string) || "",
          parkType: (p.parkType as string) || "",
        }));

      this.setCache("parking", result);
      return result;
    } catch (err) {
      console.error("[IBB] Parking data fetch failed:", err);
      const stale = this.getStaleCached<IBBParking[]>("parking");
      if (stale) {
        console.log("[IBB] Returning stale cached parking data");
        return stale;
      }
      return [];
    }
  }

  // Get all data at once (for dashboard)
  async getAllData() {
    const [trafficIndex, busPositions, incidents, parking] =
      await Promise.allSettled([
        this.getTrafficIndex(),
        this.getBusPositions(),
        this.getTrafficIncidents(),
        this.getParkingData(),
      ]);

    return {
      trafficIndex:
        trafficIndex.status === "fulfilled" ? trafficIndex.value : [],
      busPositions:
        busPositions.status === "fulfilled" ? busPositions.value : [],
      incidents: incidents.status === "fulfilled" ? incidents.value : [],
      parking: parking.status === "fulfilled" ? parking.value : [],
      fetchedAt: Date.now(),
    };
  }

  // Get data quality info
  getDataQuality() {
    return {
      trafficIndex: !!this.cache.get("trafficIndex"),
      busPositions: !!this.cache.get("busPositions"),
      incidents: !!this.cache.get("incidents"),
      parking: !!this.cache.get("parking"),
      lastUpdates: {
        trafficIndex: this.cache.get("trafficIndex")?.fetchedAt || null,
        busPositions: this.cache.get("busPositions")?.fetchedAt || null,
        incidents: this.cache.get("incidents")?.fetchedAt || null,
        parking: this.cache.get("parking")?.fetchedAt || null,
      },
    };
  }
}

export const ibbClient = new IBBDataClient();
export type { IBBTrafficIndex, IBBBusPosition, IBBIncident, IBBParking };

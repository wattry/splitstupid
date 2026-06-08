export interface IpGeoLocation {
  ip: string;
  success: boolean;
  type: string;
  continent: string;
  continent_code: string;
  country: string;
  country_code: string;
  region: string;
  region_code: string;
  city: string;
  latitude: number;
  longitude: number;
  is_eu: boolean;
  postal: string;
  calling_code: string;
  capital: string;
  borders: string;
  flag: {
    img: string;
    emoji: string;
    emoji_unicode: string;
  },
  connection: {
    asn: number;
    org: string;
    isp: string;
    domain: string;
  },
  timezone: {
    id: string;
    abbr: string;
    is_dst: true;
    offset: string;
    utc: string;
  },
  readme: string
};

export class IPLookUp {
  #location: void | IpGeoLocation = this.getCache();
  #isFetching: boolean = false;
  // The in-flight initial lookup. Resolves once the first refresh settles,
  // letting consumers await completion instead of polling `isFetching`.
  #ready: Promise<IpGeoLocation | void>;

  constructor() {
    this.#ready = this.refresh();
  }

  get ready(): Promise<IpGeoLocation | void> {
    return this.#ready;
  }

  get ip(): string | void {
    if (this.#location && this.#location) {
      return this.#location?.ip;
    }
  }

  get location() {
    return this.#location;
  }

  get isFetching() {
    return this.#isFetching;
  }

  async refresh(): Promise<IpGeoLocation|void> {
    try {
      this.#isFetching = true;
      const res = await fetch(`${import.meta.env.VITE_PROXY}?url=https://ipwho.is/`, { method: 'GET' });
      const data = await res.json();

      this.#location = data;
      sessionStorage.setItem('location', JSON.stringify(data));

    } catch (error: unknown) {
      const e = error as Error;

      console.error('Unable to fetch ip information', e.message, e.stack);
      const cache = this.getCache();

      return cache;
    } finally {
      this.#isFetching = false;
    }
  }

  getCache(): IpGeoLocation | void {
    const cache = sessionStorage.getItem('location');

    if (typeof cache === 'string') {
      try {
        return JSON.parse(cache) as IpGeoLocation;
      } catch {
        console.error('Cache is not parsable JSON');
      }
    }
  }
}


export interface Track {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

/** A track plus the login account that opens its board. */
export interface TrackWithLogin extends Track {
  loginEmail: string;
}

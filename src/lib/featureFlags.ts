function envTrue(name: string): boolean {
  return (import.meta.env[name] as string | undefined)?.trim().toLowerCase() === "true";
}

export const featureFlags = {
  killSwitchRsvpWrites: envTrue("VITE_KILL_SWITCH_RSVP_WRITES"),
  killSwitchInvites: envTrue("VITE_KILL_SWITCH_INVITES"),
  killSwitchFriendAdds: envTrue("VITE_KILL_SWITCH_FRIEND_ADDS"),
};


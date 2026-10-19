import { CardGrid, Feature, PageHero, Shots } from '../ui'

export function Vpn(): React.JSX.Element {
  return (
    <>
      <PageHero
        kicker="VPN"
        title="Private clusters,"
        em="one click away."
        lede="MagicLens ships with its own VPN client. Keep your OpenVPN, Pritunl and WireGuard profiles next to the clusters that need them, connect with one click, and watch the tunnel come up — no terminal, no separate app."
        video="vpn"
      />

      <div className="features">
        <Feature
          video="vpn"
          kicker="Connect"
          title="Profiles, tunnels and traffic — in one place."
          copy="Every profile shows its provider, server and organization. Connect, and an animated map walks you through the tunnel — MagicLens, VPN tunnel, server, private network — with live download and upload rates and a health checklist."
          bullets={[
            'OpenVPN, Pritunl and WireGuard profiles',
            'Live throughput and tunnel interface',
            'Health checks: process, interface, traffic'
          ]}
        />
        <Shots
          items={[
            { id: 'feat-vpn-profiles', cap: 'Your profiles, ready to connect' },
            { id: 'feat-vpn-connecting', cap: 'Bringing the tunnel up' },
            { id: 'feat-vpn-connected', cap: 'Connected, with live traffic' }
          ]}
        />

        <section className="band-head center">
          <span className="kicker">Sign in</span>
          <h2>PIN and MFA, handled.</h2>
          <p>
            Profiles that need a PIN and a one-time code ask for them in a small dialog. Your PIN is remembered for
            a few hours on this device; the code is only valid for the moment you need it.
          </p>
        </section>
        <Shots
          cols={2}
          items={[
            { id: 'feat-vpn-mfa', cap: 'A profile that needs a PIN and MFA' },
            { id: 'feat-vpn-credentials', cap: 'Enter the PIN and one-time code' }
          ]}
        />

        <Feature
          video="vpn"
          kicker="Together"
          title="Several tunnels, one window."
          copy="Connect to more than one network at once — a bastion for production and a corporate gateway for tooling — and switch which one is in focus. Each tunnel keeps running until you disconnect it."
          bullets={[
            'Multiple simultaneous tunnels',
            'A focus profile drives the status and traffic view',
            'Disconnect one without touching the others'
          ]}
          flip
        />
        <Shots
          cols={2}
          items={[
            { id: 'feat-vpn-multi', cap: 'Two tunnels connected at once' },
            { id: 'feat-vpn-badge', cap: 'VPN badges beside linked clusters' }
          ]}
        />

        <section className="band-head center">
          <span className="kicker">Why it matters</span>
          <h2>The network is part of the cluster.</h2>
        </section>
        <CardGrid
          items={[
            {
              title: 'Linked to clusters',
              copy: 'Attach a VPN profile to a cluster. Opening the cluster brings its tunnel up, and a badge in the sidebar shows when it is connected.'
            },
            {
              title: 'No extra apps',
              copy: 'MagicLens drives the OpenVPN and WireGuard tools for you, and can help install them when they are missing.'
            },
            {
              title: 'Credentials stay put',
              copy: 'Profile configs are stored encrypted by your operating system, and PINs live only on this device.'
            },
            {
              title: 'Clean shutdown',
              copy: 'Tunnels MagicLens opened are closed when you quit, so nothing is left running in the background.'
            },
            {
              title: 'Import in seconds',
              copy: 'Add a profile from a file or paste it in; name, server and protocol are filled in from the config.'
            },
            {
              title: 'Works with your team',
              copy: 'Organization profiles can be synced, so everyone gets the same set of tunnels.'
            }
          ]}
        />
      </div>
    </>
  )
}

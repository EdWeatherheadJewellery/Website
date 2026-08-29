import { Link } from 'react-router-dom';
import './About.css';

export default function About() {
  return (
    <section className="container about-section">
      <p className="eyebrow">About</p>
      <h1 style={{ fontSize: 'var(--size-xl)' }}>The workshop</h1>

      <div className="about-body">
        {/* Real photo, not a placeholder — its box just takes whatever
            aspect ratio the file itself has (portrait or landscape),
            since it's a genuine <img> rather than a fixed-ratio box. */}
        <img src="/images/promoselfieatworkbench1.jpg" alt="Ed at the workbench" className="about-photo" />

        {/* Placeholder copy — replace with your own story. */}

        <p>
Hi! I'm Ed, and I love making jewellery. I've been designing and creating one-of-a-kind pieces, using solid sterling silver and natural untreated gemstones and minerals, since 2016.
        </p>

        <p>
Each piece is thoughtfully designed and built to last. I use a combination of techniques including soldering, wire-wrapping, and hand-knotting pearl and gemstone beads
        </p>
        <p>
When working with pearls, I use genuine freshwater pearls, knotted by hand onto traditional silk thread for strength and durability.
        </p>
        <p>
I make necklaces, pendants and charms. In the near future, I'll add rings, earrings, bracelets, brooches (join my email list to receive updates).
        </p>
        <p>
Questions I ask myself when designing a piece:
        </p>
        <ul>
          <li>Will the design look intentional and attractive when worn?</li>
          <li>Will it be structurally sound to withstand daily wear?</li>
          <li>Will stones be held securely in place?</li>
          <li>Will softer stones (opals, diopside, pearls) be positioned so they're less exposed to being scratched?</li>
          {/* <li>Is there a practical way to make this setting? How would I construct it?</li> */}
        </ul>
        <p>
          Do you have a specific piece in mind? I accept commission requests for custom pieces. Bring your own minerals, or choose from my in-house selection. <Link to="/contact">Drop me a line</Link> and let me know what you have in mind.
        </p>
        <p>
          I have experience working with shamans and healers, and can make specific tools with the required minerals, symbols and intentions. I am attuned as a reiki channel.
        </p>

      </div>
    </section>
  );
}

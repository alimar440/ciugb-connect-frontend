-- Exécuter une fois dans une base PostgreSQL dédiée au club.
CREATE TABLE IF NOT EXISTS ciugb_event (
  id integer PRIMARY KEY CHECK (id = 1),
  capacity integer NOT NULL CHECK (capacity > 0),
  ticket_price integer NOT NULL CHECK (ticket_price > 0)
);
INSERT INTO ciugb_event (id, capacity, ticket_price) VALUES (1, 120, 500) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS ciugb_reservations (
  id uuid PRIMARY KEY,
  reference text UNIQUE NOT NULL,
  request_id uuid UNIQUE NOT NULL,
  full_name text NOT NULL CHECK (length(full_name) BETWEEN 2 AND 120),
  phone text NOT NULL,
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  amount integer NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending_payment' CHECK (status IN ('pending_payment', 'validated', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  contacted_at timestamptz,
  validated_at timestamptz
);
CREATE TABLE IF NOT EXISTS ciugb_tickets (
  id uuid PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES ciugb_reservations(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  checked_in_at timestamptz
);
CREATE INDEX IF NOT EXISTS ciugb_tickets_reservation ON ciugb_tickets(reservation_id);
CREATE INDEX IF NOT EXISTS ciugb_reservations_status ON ciugb_reservations(status);
CREATE TABLE IF NOT EXISTS ciugb_request_limits (
  key text PRIMARY KEY,
  attempts integer NOT NULL,
  expires_at timestamptz NOT NULL
);
-- Ne pas donner aux navigateurs de clé SQL ou de droit d’accès direct à ces tables.
-- Protection supplémentaire si le fournisseur expose le schéma public par REST.
ALTER TABLE ciugb_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciugb_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciugb_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ciugb_request_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ciugb_event, ciugb_reservations, ciugb_tickets, ciugb_request_limits FROM PUBLIC;

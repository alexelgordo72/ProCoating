--
-- PostgreSQL database dump
--

\restrict GDsw9bpJXF0dFHzh3RwUPZVxQyjfgwx4Cc4nhibHEqWrf1FC9MjPrpoB9JTqirb

-- Dumped from database version 18.3
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: accessories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accessories (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    daily_rate numeric(10,2) DEFAULT 0,
    stock_quantity integer DEFAULT 0
);


--
-- Name: accessories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accessories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accessories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accessories_id_seq OWNED BY public.accessories.id;


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id integer NOT NULL,
    user_id integer,
    username character varying(50),
    action character varying(100) NOT NULL,
    entity_type character varying(50),
    entity_id integer,
    details text,
    ip_address character varying(45),
    user_agent text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: audit_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.audit_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: audit_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.audit_logs_id_seq OWNED BY public.audit_logs.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    phone character varying(150),
    email character varying(200),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(50) DEFAULT 'technician'::character varying,
    phone character varying(50),
    email character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    department character varying(100),
    licenses_info text
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: equipment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.equipment (
    id integer NOT NULL,
    model character varying(100) NOT NULL,
    brand character varying(100),
    type character varying(100),
    tons numeric(5,1),
    btu_h integer,
    voltage character varying(50),
    daily_rate numeric(10,2),
    status character varying(50) DEFAULT 'available'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    name character varying(200),
    serial_number character varying(100),
    unit_number character varying(50),
    specs text
);


--
-- Name: equipment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.equipment_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: equipment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.equipment_id_seq OWNED BY public.equipment.id;


--
-- Name: inventory_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_movements (
    id integer NOT NULL,
    part_id integer,
    type character varying(20) NOT NULL,
    quantity integer NOT NULL,
    reason text,
    work_order_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_movements_id_seq OWNED BY public.inventory_movements.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    title character varying(200) NOT NULL,
    message text NOT NULL,
    link character varying(500),
    is_read boolean DEFAULT false,
    user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer,
    spare_part_id integer,
    quantity_ordered integer NOT NULL,
    quantity_received integer DEFAULT 0,
    unit_price numeric(10,2) NOT NULL,
    total numeric(10,2) NOT NULL
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    po_number character varying(50) NOT NULL,
    supplier_id integer,
    order_date date DEFAULT CURRENT_DATE,
    expected_date date,
    received_date date,
    status character varying(50) DEFAULT 'pending'::character varying,
    subtotal numeric(10,2) DEFAULT 0,
    tax numeric(10,2) DEFAULT 0,
    total numeric(10,2) DEFAULT 0,
    notes text,
    created_by character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: rental_accessories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rental_accessories (
    id integer NOT NULL,
    rental_id integer,
    accessory_id integer,
    quantity integer DEFAULT 1,
    unit_rate numeric(10,2)
);


--
-- Name: rental_accessories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rental_accessories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rental_accessories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rental_accessories_id_seq OWNED BY public.rental_accessories.id;


--
-- Name: rentals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rentals (
    id integer NOT NULL,
    rental_number character varying(50) NOT NULL,
    customer_id integer NOT NULL,
    equipment_id integer NOT NULL,
    start_date date NOT NULL,
    end_date date,
    delivery_date date,
    pickup_date date,
    total_days integer,
    subtotal numeric(10,2),
    notes text,
    status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: rentals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rentals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rentals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rentals_id_seq OWNED BY public.rentals.id;


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text
);


--
-- Name: roles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.roles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: roles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.roles_id_seq OWNED BY public.roles.id;


--
-- Name: spare_parts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.spare_parts (
    id integer NOT NULL,
    part_number character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    category character varying(100),
    location character varying(100),
    stock_quantity integer DEFAULT 0,
    min_stock integer DEFAULT 5,
    max_stock integer DEFAULT 100,
    unit_price numeric(10,2) DEFAULT 0,
    last_restocked date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    supplier_name character varying(200)
);


--
-- Name: spare_parts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.spare_parts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: spare_parts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.spare_parts_id_seq OWNED BY public.spare_parts.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    contact_name character varying(100),
    phone character varying(50),
    email character varying(100),
    address text,
    tax_id character varying(50),
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username character varying(50) NOT NULL,
    password character varying(255) NOT NULL,
    full_name character varying(100),
    email character varying(100),
    role_id integer,
    is_active boolean DEFAULT true,
    last_login timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id integer NOT NULL,
    plate character varying(50) NOT NULL,
    model character varying(100),
    year integer,
    status character varying(50) DEFAULT 'available'::character varying,
    assigned_employee_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    vehicle_type character varying(30) DEFAULT 'vehicle'::character varying,
    registration_number character varying(50),
    tag_expiration character varying(50),
    owner_name character varying(100),
    inspection_ok boolean
);


--
-- Name: vehicles_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vehicles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vehicles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vehicles_id_seq OWNED BY public.vehicles.id;


--
-- Name: work_order_costs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_costs (
    id integer NOT NULL,
    work_order_id integer,
    description character varying(200) NOT NULL,
    amount numeric(10,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: work_order_costs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_order_costs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_order_costs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_order_costs_id_seq OWNED BY public.work_order_costs.id;


--
-- Name: work_order_photos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_order_photos (
    id integer NOT NULL,
    work_order_id integer,
    image_url text NOT NULL,
    description character varying(200),
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: work_order_photos_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_order_photos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_order_photos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_order_photos_id_seq OWNED BY public.work_order_photos.id;


--
-- Name: work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_orders (
    id integer NOT NULL,
    wo_number character varying(50) NOT NULL,
    customer_id integer,
    equipment_id integer,
    employee_id integer,
    vehicle_id integer,
    priority character varying(20) DEFAULT 'normal'::character varying,
    reported_issue text,
    diagnosis text,
    solution text,
    start_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    end_date timestamp without time zone,
    is_warranty boolean DEFAULT false,
    internal_cost numeric(10,2) DEFAULT 0,
    status character varying(50) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_orders_id_seq OWNED BY public.work_orders.id;


--
-- Name: accessories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessories ALTER COLUMN id SET DEFAULT nextval('public.accessories_id_seq'::regclass);


--
-- Name: audit_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs ALTER COLUMN id SET DEFAULT nextval('public.audit_logs_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: equipment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment ALTER COLUMN id SET DEFAULT nextval('public.equipment_id_seq'::regclass);


--
-- Name: inventory_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements ALTER COLUMN id SET DEFAULT nextval('public.inventory_movements_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: rental_accessories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_accessories ALTER COLUMN id SET DEFAULT nextval('public.rental_accessories_id_seq'::regclass);


--
-- Name: rentals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals ALTER COLUMN id SET DEFAULT nextval('public.rentals_id_seq'::regclass);


--
-- Name: roles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles ALTER COLUMN id SET DEFAULT nextval('public.roles_id_seq'::regclass);


--
-- Name: spare_parts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts ALTER COLUMN id SET DEFAULT nextval('public.spare_parts_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: vehicles id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles ALTER COLUMN id SET DEFAULT nextval('public.vehicles_id_seq'::regclass);


--
-- Name: work_order_costs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_costs ALTER COLUMN id SET DEFAULT nextval('public.work_order_costs_id_seq'::regclass);


--
-- Name: work_order_photos id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_photos ALTER COLUMN id SET DEFAULT nextval('public.work_order_photos_id_seq'::regclass);


--
-- Name: work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders ALTER COLUMN id SET DEFAULT nextval('public.work_orders_id_seq'::regclass);


--
-- Name: accessories accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accessories
    ADD CONSTRAINT accessories_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: equipment equipment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.equipment
    ADD CONSTRAINT equipment_pkey PRIMARY KEY (id);


--
-- Name: inventory_movements inventory_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_po_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_po_number_key UNIQUE (po_number);


--
-- Name: rental_accessories rental_accessories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_accessories
    ADD CONSTRAINT rental_accessories_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_pkey PRIMARY KEY (id);


--
-- Name: rentals rentals_rental_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_rental_number_key UNIQUE (rental_number);


--
-- Name: roles roles_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: spare_parts spare_parts_part_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT spare_parts_part_number_key UNIQUE (part_number);


--
-- Name: spare_parts spare_parts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.spare_parts
    ADD CONSTRAINT spare_parts_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_key UNIQUE (username);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_plate_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_plate_key UNIQUE (plate);


--
-- Name: work_order_costs work_order_costs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_costs
    ADD CONSTRAINT work_order_costs_pkey PRIMARY KEY (id);


--
-- Name: work_order_photos work_order_photos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_photos
    ADD CONSTRAINT work_order_photos_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_pkey PRIMARY KEY (id);


--
-- Name: work_orders work_orders_wo_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_wo_number_key UNIQUE (wo_number);


--
-- Name: idx_audit_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_action ON public.audit_logs USING btree (action);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: inventory_movements inventory_movements_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_part_id_fkey FOREIGN KEY (part_id) REFERENCES public.spare_parts(id);


--
-- Name: inventory_movements inventory_movements_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_movements
    ADD CONSTRAINT inventory_movements_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_spare_part_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_spare_part_id_fkey FOREIGN KEY (spare_part_id) REFERENCES public.spare_parts(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: rental_accessories rental_accessories_accessory_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_accessories
    ADD CONSTRAINT rental_accessories_accessory_id_fkey FOREIGN KEY (accessory_id) REFERENCES public.accessories(id);


--
-- Name: rental_accessories rental_accessories_rental_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rental_accessories
    ADD CONSTRAINT rental_accessories_rental_id_fkey FOREIGN KEY (rental_id) REFERENCES public.rentals(id) ON DELETE CASCADE;


--
-- Name: rentals rentals_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: rentals rentals_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rentals
    ADD CONSTRAINT rentals_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: users users_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);


--
-- Name: vehicles vehicles_assigned_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_assigned_employee_id_fkey FOREIGN KEY (assigned_employee_id) REFERENCES public.employees(id);


--
-- Name: work_order_costs work_order_costs_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_costs
    ADD CONSTRAINT work_order_costs_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_order_photos work_order_photos_work_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_order_photos
    ADD CONSTRAINT work_order_photos_work_order_id_fkey FOREIGN KEY (work_order_id) REFERENCES public.work_orders(id) ON DELETE CASCADE;


--
-- Name: work_orders work_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: work_orders work_orders_employee_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES public.employees(id);


--
-- Name: work_orders work_orders_equipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_equipment_id_fkey FOREIGN KEY (equipment_id) REFERENCES public.equipment(id);


--
-- Name: work_orders work_orders_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_orders
    ADD CONSTRAINT work_orders_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- PostgreSQL database dump complete
--

\unrestrict GDsw9bpJXF0dFHzh3RwUPZVxQyjfgwx4Cc4nhibHEqWrf1FC9MjPrpoB9JTqirb


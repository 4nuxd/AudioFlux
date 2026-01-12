// ========== Express / Socket.IO ==========
const app = express();

const corsOptions = {
  origin: '*', // Allow all origins (or specify your frontend URL like 'https://yoursite.vercel.app')
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: '2mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

const server = http.createServer(app);

const io = new Server(server, {
  cors: corsOptions,
  transports: ['websocket', 'polling']
});

// Adds 5 restaurants to every city of Armenia except Yerevan (which gets its 10 on the server's first run):
// npm run seed:restaurants
// Running it again adds nothing: a restaurant with the same name in the same city is skipped.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'data', 'tablebook.db');

// The server creates and updates the database, so it must have run at least once
if (!fs.existsSync(DB_FILE)) {
  console.log('No database yet. Start the server once (npm start), then run npm run seed:restaurants.');
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE);
const restaurantColumns = db.prepare('PRAGMA table_info(restaurants)').all().map((c) => c.name);
if (!restaurantColumns.includes('city')) {
  console.log('The database is not updated yet. Restart the server (npm start), then run npm run seed:restaurants.');
  process.exit(1);
}

// Same hall as new restaurants get in server.js: seats per table, tables numbered 1–8
const DEFAULT_TABLE_SEATS = [2, 2, 2, 4, 4, 4, 6, 8];

// Restaurant photos, used in turn
const PHOTOS = [
  '1785845506893-70768a28ba44', '1753727471014-efe38840c7c7', '1667388969250-1c7220bf3f37',
  '1682778418768-16081e4470a1', '1517248135467-4c7edcad34c4', '1667388968964-4aa652df0a9b',
  '1771574205963-0c1d84ac7354', '1552960226-639240203497', '1687648431656-da99da578d50',
  '1560130934-590b85fc08e7',
].map((id) => `https://images.unsplash.com/photo-${id}?w=700&q=70&auto=format&fit=crop`);

// city: [name, cuisine, address, description]
const RESTAURANTS = {
  gyumri: [
    ['Shirak Hall', 'Armenian', '12 Rizhkov Street, Gyumri', 'Gyumri dishes in a hall of black tuff stone.'],
    ['Kumayri Tavern', 'Armenian grill', '25 Abovyan Street, Gyumri', 'Khorovats and fresh lavash in the old town.'],
    ['Vardanants Café', 'Café', '3 Vardanants Square, Gyumri', 'Coffee and desserts on the main square.'],
    ['Black Fortress Grill', 'Steakhouse', '40 Varpetats Street, Gyumri', 'Steaks and grilled vegetables near the Black Fortress.'],
    ['Polo Pizza', 'Italian', '18 Sayat-Nova Avenue, Gyumri', 'Wood-fired pizza and handmade pasta.'],
  ],
  vanadzor: [
    ['Lori Table', 'Armenian', '10 Tigran Mets Avenue, Vanadzor', 'Home-style Lori cooking with mountain herbs.'],
    ['Pambak Grill', 'Armenian grill', '22 Myasnikyan Street, Vanadzor', 'Grilled meat and vegetables by the Pambak river.'],
    ['Forest Café', 'Café', '5 Hayk Square, Vanadzor', 'A quiet café with pastries and herbal tea.'],
    ['Trattoria Lori', 'Italian', '31 Batumi Street, Vanadzor', 'Pasta, risotto and pizza in a cosy hall.'],
    ['Silk Road Kitchen', 'Georgian', '14 Grigor Lusavorich Street, Vanadzor', 'Khinkali, khachapuri and Georgian wines.'],
  ],
  vagharshapat: [
    ['Etchmiadzin Garden', 'Armenian', '8 Mashtots Street, Vagharshapat', 'Traditional dishes in a green garden near the cathedral.'],
    ['Zvartnots Terrace', 'Fine dining', '20 Komitas Street, Vagharshapat', 'An elegant terrace for family celebrations.'],
    ['Holy Bread Bakery', 'Café', '4 Atarbekyan Street, Vagharshapat', 'Fresh gata, nazook and coffee.'],
    ['Ararat Valley Grill', 'Armenian grill', '35 Charents Street, Vagharshapat', 'Khorovats with vegetables from the Ararat valley.'],
    ['Little Italy', 'Italian', '12 Spandaryan Street, Vagharshapat', 'Pizza and pasta for the whole family.'],
  ],
  abovyan: [
    ['Kotayk House', 'Armenian', '6 Hanrapetutyan Street, Abovyan', 'Classic Armenian cuisine and live music on weekends.'],
    ['Abovyan Grill', 'Armenian grill', '19 Kotayk Street, Abovyan', 'Lamb and pork khorovats from the coals.'],
    ['Sunrise Café', 'Café', '2 Central Square, Abovyan', 'Breakfasts, sandwiches and fresh juices.'],
    ['Sushi Point', 'Japanese', '11 Yerevanyan Highway, Abovyan', 'Rolls, sushi and ramen.'],
    ['Pizza Corner', 'Italian', '27 Sevan Street, Abovyan', 'Thin-crust pizza and salads.'],
  ],
  hrazdan: [
    ['Hrazdan Gorge', 'Armenian', '15 Kentron District, Hrazdan', 'Mountain dishes with a view of the gorge.'],
    ['Pine Lodge', 'Armenian grill', '7 Vanatur Street, Hrazdan', 'A wooden lodge with grilled trout and khorovats.'],
    ['Lake View Café', 'Café', '3 Mikroshrjan, Hrazdan', 'Coffee and cakes by the Hrazdan reservoir.'],
    ['Old Mill', 'European', '21 Shahumyan Street, Hrazdan', 'European dishes in a restored stone mill.'],
    ['Kebab Yard', 'Middle Eastern', '9 Hanrapetutyan Street, Hrazdan', 'Kebabs, hummus and warm bread.'],
  ],
  kapan: [
    ['Syunik Hearth', 'Armenian', '5 Garegin Nzhdeh Square, Kapan', 'Syunik recipes cooked in a stone oven.'],
    ['Khustup Grill', 'Armenian grill', '18 Shahumyan Street, Kapan', 'Grilled meat with a view of Mount Khustup.'],
    ['Voghji Café', 'Café', '2 Demirchyan Street, Kapan', 'A riverside café with homemade desserts.'],
    ['Copper Pot', 'European', '24 Aram Manukyan Street, Kapan', 'Soups, stews and steaks in a warm hall.'],
    ['Mountain Pizza', 'Italian', '11 Baghaberd District, Kapan', 'Stone-baked pizza and pasta.'],
  ],
  armavir: [
    ['Sardarapat Hall', 'Fine dining', '10 Abovyan Street, Armavir', 'A spacious hall for weddings and celebrations.'],
    ['Armavir Grill', 'Armenian grill', '28 Shahumyan Street, Armavir', 'Khorovats and fresh salads from local farms.'],
    ['Apricot Café', 'Café', '3 Hanrapetutyan Street, Armavir', 'Apricot desserts, coffee and tea.'],
    ['Valley Kitchen', 'Armenian', '16 Isahakyan Street, Armavir', 'Dolma, harissa and other home dishes.'],
    ['Pasta & Co', 'Italian', '7 Tumanyan Street, Armavir', 'Pasta, lasagna and tiramisu.'],
  ],
  artashat: [
    ['Artaxiad Table', 'Armenian', '12 Shahumyan Street, Artashat', 'Old Armenian recipes near ancient Artashat.'],
    ['Khor Virap View', 'Armenian grill', '30 Ogostosi 23 Street, Artashat', 'Grilled dishes with a view of Khor Virap and Ararat.'],
    ['Grape Café', 'Café', '4 Markets Square, Artashat', 'Coffee, pastries and fresh fruit.'],
    ['Ararat Fish', 'Seafood', '19 Isahakyan Street, Artashat', 'Trout and fish from the Ararat valley ponds.'],
    ['Pizzeria Artashat', 'Italian', '9 Tigran Mets Street, Artashat', 'Pizza and pasta for a quick dinner.'],
  ],
  ashtarak: [
    ['Kasagh Gorge', 'Armenian', '6 Narekatsi Street, Ashtarak', 'Traditional dishes above the Kasagh gorge.'],
    ['Three Bridges Grill', 'Armenian grill', '14 Bridge Street, Ashtarak', 'Khorovats near the old stone bridge.'],
    ['Aragats Café', 'Café', '2 Hanrapetutyan Square, Ashtarak', 'Coffee and cakes with a view of Mount Aragats.'],
    ['Wine Yard', 'European', '22 Grigor Lusavorich Street, Ashtarak', 'Local wines and European cuisine.'],
    ['Spice Garden', 'Indian', '11 Charents Street, Ashtarak', 'Curries and tandoor dishes.'],
  ],
  gavar: [
    ['Sevan Shore', 'Seafood', '8 Kentron Street, Gavar', 'Sevan trout and crayfish.'],
    ['Gegharkunik House', 'Armenian', '17 Hanrapetutyan Street, Gavar', 'Hearty mountain dishes and fresh bread.'],
    ['Highland Grill', 'Armenian grill', '25 Sayat-Nova Street, Gavar', 'Lamb khorovats cooked on vine branches.'],
    ['Blue Lake Café', 'Café', '3 Gavar Square, Gavar', 'Hot drinks and pastries for cold days.'],
    ['Pizza Gavar', 'Italian', '12 Grigor Narekatsi Street, Gavar', 'Pizza, pasta and salads.'],
  ],
  goris: [
    ['Old Goris Stone', 'Armenian', '10 Mashtots Street, Goris', 'Syunik dishes in a stone house of old Goris.'],
    ['Tatev Road Grill', 'Armenian grill', '21 Syunik Street, Goris', 'Grilled meat on the way to Tatev.'],
    ['Mulberry Café', 'Café', '4 Central Square, Goris', 'Mulberry vodka, desserts and coffee.'],
    ['Khndzoresk Terrace', 'Fine dining', '15 Ankakhutyan Street, Goris', 'An elegant terrace for special evenings.'],
    ['Cave Kitchen', 'European', '8 Davit Bek Street, Goris', 'European dishes in a hall carved into rock.'],
  ],
  dilijan: [
    ['Dilijan Forest', 'Armenian', '12 Getapnya Street, Dilijan', 'Forest mushrooms and Tavush recipes.'],
    ['Old Dilijan Tavern', 'Armenian grill', '5 Sharambeyan Street, Dilijan', 'Khorovats in the restored old street.'],
    ['Parz Lake Café', 'Café', '20 Myasnikyan Street, Dilijan', 'Coffee, honey cakes and herbal tea.'],
    ['Mountain Chalet', 'European', '33 Kalinin Street, Dilijan', 'Fondue, soups and steaks in a wooden chalet.'],
    ['Haghartsin Fish House', 'Seafood', '9 Abovyan Street, Dilijan', 'Fresh trout from mountain streams.'],
  ],
  ijevan: [
    ['Tavush Table', 'Armenian', '7 Yerevanyan Street, Ijevan', 'Tavush cuisine and local wines.'],
    ['Aghstev Grill', 'Armenian grill', '16 Aghstev Street, Ijevan', 'Grilled dishes on the bank of the Aghstev.'],
    ['Ijevan Wine Café', 'Café', '3 Ankakhutyan Street, Ijevan', 'Wine tasting, cheese and desserts.'],
    ['Green Valley', 'European', '24 Erebuni Street, Ijevan', 'Light European dishes and salads.'],
    ['Khachapuri House', 'Georgian', '11 Gortsaranayin Street, Ijevan', 'Khachapuri, khinkali and lobio.'],
  ],
  sevan: [
    ['Sevanavank Shore', 'Seafood', '4 Sevan Peninsula, Sevan', 'Sevan trout and crayfish by the water.'],
    ['Lake House', 'Armenian', '18 Nairyan Street, Sevan', 'Armenian dishes with a view of the lake.'],
    ['Blue Wave Grill', 'Armenian grill', '27 Shoreline Road, Sevan', 'Grilled fish and khorovats on the beach.'],
    ['Seagull Café', 'Café', '6 Kentron Street, Sevan', 'Coffee, ice cream and pastries.'],
    ['Pizza Sevan', 'Italian', '13 Gyulbenkyan Street, Sevan', 'Pizza and pasta after a day on the beach.'],
  ],
  jermuk: [
    ['Jermuk Spring', 'Armenian', '9 Shahumyan Street, Jermuk', 'Healthy Armenian dishes in the spa town.'],
    ['Waterfall Grill', 'Armenian grill', '20 Myasnikyan Street, Jermuk', 'Khorovats near the Jermuk waterfall.'],
    ['Gallery Café', 'Café', '2 Gallery Square, Jermuk', 'Coffee and desserts by the mineral water gallery.'],
    ['Alpine Lodge', 'European', '15 Miasnikyan Avenue, Jermuk', 'Soups, steaks and mountain teas.'],
    ['Trout Farm Kitchen', 'Seafood', '7 Arpa Street, Jermuk', 'Trout from the Arpa river.'],
  ],
  tsaghkadzor: [
    ['Ski Lodge', 'European', '12 Orbeli Brothers Street, Tsaghkadzor', 'Warm dishes after a day on the slopes.'],
    ['Kecharis Table', 'Armenian', '4 Kecharetsi Street, Tsaghkadzor', 'Armenian cuisine near Kecharis monastery.'],
    ['Teghenis Grill', 'Armenian grill', '22 Teghenis Street, Tsaghkadzor', 'Khorovats with a view of Mount Teghenis.'],
    ['Flower Valley Café', 'Café', '8 Charents Street, Tsaghkadzor', 'Hot chocolate, cakes and mulled wine.'],
    ['Alpine Pizza', 'Italian', '15 Ropeway Street, Tsaghkadzor', 'Pizza and pasta by the ropeway.'],
  ],
  sisian: [
    ['Zorats Karer', 'Armenian', '10 Sisakan Street, Sisian', 'Syunik dishes near the ancient Carahunge stones.'],
    ['Vorotan Grill', 'Armenian grill', '19 Vorotan Street, Sisian', 'Grilled meat by the Vorotan river.'],
    ['Shaki Café', 'Café', '3 Central Square, Sisian', 'Coffee and pastries on the way to Shaki waterfall.'],
    ['Highland Kitchen', 'European', '26 Garegin Nzhdeh Street, Sisian', 'Simple European dishes for travellers.'],
    ['Lavash & Cheese', 'Armenian', '12 Sisavan Street, Sisian', 'Fresh lavash, local cheese and herbs.'],
  ],
  stepanavan: [
    ['Dendropark Table', 'Armenian', '8 Garegin Nzhdeh Street, Stepanavan', 'Lori dishes near the old dendropark.'],
    ['Dzoraget Grill', 'Armenian grill', '17 Dzoraget Street, Stepanavan', 'Khorovats on the edge of the Dzoraget canyon.'],
    ['Lori Fortress Café', 'Café', '2 Shahumyan Square, Stepanavan', 'Coffee, cakes and herbal teas.'],
    ['Forest Mushroom', 'European', '23 Ankakhutyan Street, Stepanavan', 'Mushroom dishes and soups.'],
    ['Pizzeria Stepanavan', 'Italian', '11 Lori Street, Stepanavan', 'Pizza and pasta in a family hall.'],
  ],
  yeghegnadzor: [
    ['Vayots Dzor Table', 'Armenian', '6 Narekatsi Street, Yeghegnadzor', 'Vayots Dzor dishes and Areni wines.'],
    ['Areni Wine House', 'Fine dining', '15 Shahumyan Street, Yeghegnadzor', 'Local wines with a tasting menu.'],
    ['Noravank Grill', 'Armenian grill', '24 Spandaryan Street, Yeghegnadzor', 'Khorovats on the road to Noravank.'],
    ['Arpa Café', 'Café', '3 Central Square, Yeghegnadzor', 'Coffee, gata and fruit.'],
    ['Smoky Trout', 'Seafood', '10 Arpa Street, Yeghegnadzor', 'Smoked and grilled trout.'],
  ],
  alaverdi: [
    ['Debed Canyon', 'Armenian', '7 Sayat-Nova Street, Alaverdi', 'Lori dishes deep in the Debed canyon.'],
    ['Sanahin Table', 'Armenian grill', '14 Sanahin District, Alaverdi', 'Grilled meat near Sanahin monastery.'],
    ['Haghpat Café', 'Café', '2 Central Square, Alaverdi', 'Coffee and homemade desserts.'],
    ['Copper Town Kitchen', 'European', '19 Zoravar Andranik Street, Alaverdi', 'Hearty European dishes.'],
    ['Bridge Pizza', 'Italian', '11 Old Bridge Street, Alaverdi', 'Pizza near the medieval bridge.'],
  ],
  masis: [
    ['Masis View', 'Armenian', '9 Narekatsi Street, Masis', 'Armenian cuisine with a view of Mount Ararat.'],
    ['Ararat Grill', 'Armenian grill', '18 Hanrapetutyan Street, Masis', 'Khorovats and vegetables from local farms.'],
    ['Station Café', 'Café', '4 Kayaranayin Street, Masis', 'Coffee and pastries near the station.'],
    ['Green Garden', 'European', '26 Shahumyan Street, Masis', 'Salads, soups and grilled chicken.'],
    ['Shawarma Street', 'Middle Eastern', '12 Yerevanyan Street, Masis', 'Shawarma, falafel and kebabs.'],
  ],
  charentsavan: [
    ['Charents Hall', 'Fine dining', '5 Charents Street, Charentsavan', 'An elegant hall named after the poet.'],
    ['Kotayk Grill', 'Armenian grill', '16 Hanrapetutyan Street, Charentsavan', 'Khorovats and fresh lavash.'],
    ['Poet Café', 'Café', '2 Central Square, Charentsavan', 'Coffee, books and desserts.'],
    ['Family Kitchen', 'Armenian', '21 Tumanyan Street, Charentsavan', 'Home-style Armenian dishes.'],
    ['Pizza Charents', 'Italian', '9 Isahakyan Street, Charentsavan', 'Pizza and pasta for families.'],
  ],
  meghri: [
    ['Meghri Fortress', 'Armenian', '8 Fortress Street, Meghri', 'Southern Armenian dishes near the old fortress.'],
    ['Pomegranate Garden', 'Fine dining', '15 Gardens Street, Meghri', 'Dishes with Meghri pomegranates and figs.'],
    ['Araks Grill', 'Armenian grill', '22 Araks Street, Meghri', 'Grilled meat by the Araks river.'],
    ['Fig Tree Café', 'Café', '3 Central Square, Meghri', 'Fig jam, coffee and pastries.'],
    ['Southern Kebab', 'Middle Eastern', '12 Border Road, Meghri', 'Kebabs, rice and grilled vegetables.'],
  ],
};

const exists = db.prepare('SELECT 1 FROM restaurants WHERE name = ? AND city = ?');
const insertRestaurant = db.prepare(
  'INSERT INTO restaurants (name, cuisine, address, city, description, image_url) VALUES (?, ?, ?, ?, ?, ?)'
);
const insertTable = db.prepare('INSERT INTO tables (restaurant_id, number, seats) VALUES (?, ?, ?)');

let added = 0;
let photo = 0;
db.exec('BEGIN');
for (const [city, list] of Object.entries(RESTAURANTS)) {
  for (const [name, cuisine, address, description] of list) {
    if (exists.get(name, city)) continue;
    const { lastInsertRowid } = insertRestaurant.run(name, cuisine, address, city, description, PHOTOS[photo++ % PHOTOS.length]);
    DEFAULT_TABLE_SEATS.forEach((seats, i) => insertTable.run(lastInsertRowid, i + 1, seats));
    added++;
  }
}
db.exec('COMMIT');

console.log(added ? `Added ${added} restaurants.` : 'All restaurants are already there. Nothing was changed.');

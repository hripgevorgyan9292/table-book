// Gives every restaurant that has no menu yet a sample menu that fits its cuisine:
// npm run seed:menus
// Restaurants that already have dishes are left as they are, so running it again changes nothing.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DB_FILE = path.join(__dirname, '..', 'data', 'tablebook.db');

// The server creates and updates the database, so it must have run at least once
if (!fs.existsSync(DB_FILE)) {
  console.log('No database yet. Start the server once (npm start), then run npm run seed:menus.');
  process.exit(1);
}

const db = new DatabaseSync(DB_FILE);
if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'menu_items'").get()) {
  console.log('The database is not updated yet. Restart the server (npm start), then run npm run seed:menus.');
  process.exit(1);
}

// cuisine: [category, name, description, price in drams]
const MENUS = {
  armenian: [
    ['starters', 'Basturma & sujukh', 'Cured beef and spicy sausage with greens', 3200],
    ['salads', 'Eetch', 'Bulgur with tomato, pepper and herbs', 1800],
    ['soups', 'Spas', 'Warm yoghurt soup with wheat and mint', 1500],
    ['mains', 'Dolma', 'Vine leaves stuffed with meat and rice, with garlic yoghurt', 3500],
    ['mains', 'Harissa', 'Slow-cooked wheat and chicken', 3000],
    ['desserts', 'Gata', 'Sweet bread with butter filling', 1200],
    ['drinks', 'Armenian coffee', '', 700],
    ['drinks', 'Tan', 'Cold salted yoghurt drink', 600],
  ],
  'armenian grill': [
    ['starters', 'Lavash & herbs', 'Fresh lavash from the tonir with cheese and greens', 1500],
    ['salads', 'Grilled vegetable salad', 'Aubergine, pepper and tomato from the coals', 1800],
    ['grill', 'Pork khorovats', 'Pork neck on the coals, with onion and sumac', 4500],
    ['grill', 'Lamb khorovats', 'Lamb ribs on vine branches', 5500],
    ['grill', 'Chicken kebab', 'Minced chicken on a skewer', 3200],
    ['grill', 'Lula kebab', 'Minced beef and lamb on a skewer', 3500],
    ['desserts', 'Pakhlava', 'Walnut and honey pastry', 1400],
    ['drinks', 'Homemade compote', '', 800],
  ],
  'fine dining': [
    ['starters', 'Beef tartare', 'With quail egg and toasted brioche', 6500],
    ['salads', 'Burrata & heirloom tomatoes', 'Basil oil and aged balsamic', 5800],
    ['soups', 'Lobster bisque', 'With cognac cream', 7200],
    ['mains', 'Duck breast', 'Cherry sauce and celery purée', 9800],
    ['mains', 'Sevan trout fillet', 'Saffron beurre blanc', 8500],
    ['desserts', 'Chocolate fondant', 'With vanilla ice cream', 3800],
    ['drinks', 'Areni red wine (glass)', '', 3500],
  ],
  french: [
    ['starters', 'Escargots de Bourgogne', 'Snails with garlic and parsley butter', 5200],
    ['soups', 'French onion soup', 'With gratinated cheese toast', 3200],
    ['salads', 'Niçoise salad', 'Tuna, egg, olives and green beans', 3900],
    ['mains', 'Boeuf bourguignon', 'Beef braised in red wine', 7500],
    ['mains', 'Coq au vin', 'Chicken in wine with mushrooms', 6200],
    ['desserts', 'Crème brûlée', '', 2800],
    ['drinks', 'Glass of Bordeaux', '', 4000],
  ],
  italian: [
    ['starters', 'Bruschetta', 'Tomato, garlic and basil', 1900],
    ['salads', 'Caprese', 'Mozzarella, tomato and basil', 3200],
    ['mains', 'Pizza Margherita', 'Wood-fired, with mozzarella and basil', 3500],
    ['mains', 'Spaghetti carbonara', 'Guanciale, egg yolk and pecorino', 3800],
    ['mains', 'Lasagna', 'Beef ragù and béchamel', 4200],
    ['desserts', 'Tiramisu', '', 2200],
    ['drinks', 'Espresso', '', 700],
    ['drinks', 'Lemonade', 'Homemade, with mint', 1200],
  ],
  japanese: [
    ['starters', 'Edamame', 'With sea salt', 1800],
    ['soups', 'Miso soup', 'Tofu, wakame and spring onion', 1600],
    ['soups', 'Tonkotsu ramen', 'Pork broth, chashu and egg', 4500],
    ['mains', 'Philadelphia roll', 'Salmon, cream cheese and cucumber (8 pcs)', 4200],
    ['mains', 'Salmon nigiri', '2 pcs', 2200],
    ['mains', 'Chicken teriyaki', 'With rice', 3900],
    ['desserts', 'Mochi', 'Three flavours', 2000],
    ['drinks', 'Green tea', '', 900],
  ],
  café: [
    ['starters', 'Croissant', 'Butter croissant', 900],
    ['mains', 'Breakfast plate', 'Eggs, cheese, vegetables and toast', 2500],
    ['mains', 'Club sandwich', 'Chicken, bacon and egg', 2800],
    ['salads', 'Caesar salad', 'Chicken, parmesan and croutons', 2900],
    ['desserts', 'Cheesecake', '', 1800],
    ['desserts', 'Honey cake', '', 1600],
    ['drinks', 'Cappuccino', '', 1100],
    ['drinks', 'Fresh orange juice', '', 1300],
  ],
  steakhouse: [
    ['starters', 'Grilled halloumi', 'With honey and thyme', 2800],
    ['salads', 'Wedge salad', 'Blue cheese and bacon', 2600],
    ['grill', 'Ribeye steak (300 g)', 'With pepper sauce', 11500],
    ['grill', 'Beef tenderloin (250 g)', 'With red wine sauce', 12500],
    ['grill', 'Burger', 'Beef patty, cheddar and fries', 4200],
    ['mains', 'Mashed potatoes & mushrooms', '', 1800],
    ['desserts', 'Brownie', 'With ice cream', 2100],
    ['drinks', 'Craft beer', '', 1500],
  ],
  indian: [
    ['starters', 'Samosa', 'Potato and pea pastries (2 pcs)', 1600],
    ['soups', 'Dal', 'Spiced red lentils', 2000],
    ['mains', 'Butter chicken', 'With basmati rice', 4200],
    ['mains', 'Palak paneer', 'Spinach and cottage cheese', 3600],
    ['grill', 'Chicken tikka', 'From the tandoor', 3900],
    ['mains', 'Garlic naan', '', 900],
    ['desserts', 'Gulab jamun', '', 1500],
    ['drinks', 'Mango lassi', '', 1400],
  ],
  seafood: [
    ['starters', 'Sevan crayfish', 'Boiled with dill (10 pcs)', 6000],
    ['soups', 'Fish soup', 'Trout and vegetables', 2600],
    ['salads', 'Seafood salad', 'Shrimp, squid and greens', 4800],
    ['grill', 'Grilled trout', 'Whole Sevan trout with lemon', 5500],
    ['mains', 'Ishkhan in tonir', 'Baked Sevan trout with herbs', 7000],
    ['mains', 'Shrimp in garlic butter', '', 6200],
    ['desserts', 'Lemon tart', '', 1900],
    ['drinks', 'Glass of white wine', '', 2800],
  ],
  georgian: [
    ['starters', 'Pkhali', 'Spinach and walnut pâté', 2200],
    ['mains', 'Khachapuri Adjaruli', 'Cheese bread with egg', 3200],
    ['mains', 'Khinkali', 'Meat dumplings (5 pcs)', 2500],
    ['soups', 'Kharcho', 'Beef and rice soup with walnuts', 2400],
    ['grill', 'Mtsvadi', 'Pork skewers', 4200],
    ['desserts', 'Churchkhela', '', 1200],
    ['drinks', 'Saperavi (glass)', '', 2600],
  ],
  european: [
    ['starters', 'Cheese plate', 'Three local cheeses with honey', 3600],
    ['soups', 'Mushroom cream soup', '', 2400],
    ['salads', 'Greek salad', '', 2600],
    ['mains', 'Chicken schnitzel', 'With potato salad', 3800],
    ['mains', 'Pasta with forest mushrooms', '', 3500],
    ['grill', 'Pork steak', 'With grilled vegetables', 4600],
    ['desserts', 'Apple strudel', 'With vanilla sauce', 2000],
    ['drinks', 'Herbal tea', 'Mountain thyme and mint', 900],
  ],
  'middle eastern': [
    ['starters', 'Hummus', 'With olive oil and pita', 1800],
    ['starters', 'Falafel', '6 pcs with tahini', 2000],
    ['salads', 'Tabbouleh', 'Parsley, bulgur and lemon', 1900],
    ['grill', 'Chicken shawarma', 'In lavash with garlic sauce', 2200],
    ['grill', 'Adana kebab', 'Spicy minced lamb', 3800],
    ['mains', 'Rice pilaf', '', 1200],
    ['desserts', 'Baklava', '', 1500],
    ['drinks', 'Ayran', '', 600],
  ],
};

const restaurants = db.prepare(`
  SELECT id, cuisine FROM restaurants WHERE id NOT IN (SELECT DISTINCT restaurant_id FROM menu_items)
`).all();
const insert = db.prepare('INSERT INTO menu_items (restaurant_id, category, name, description, price) VALUES (?, ?, ?, ?, ?)');

let filled = 0;
db.exec('BEGIN');
for (const restaurant of restaurants) {
  // Unknown cuisines get the Armenian menu
  const menu = MENUS[restaurant.cuisine.trim().toLowerCase()] || MENUS.armenian;
  menu.forEach(([category, name, description, price]) => insert.run(restaurant.id, category, name, description, price));
  filled++;
}
db.exec('COMMIT');

console.log(filled ? `Added a menu to ${filled} restaurants.` : 'Every restaurant already has a menu. Nothing was changed.');

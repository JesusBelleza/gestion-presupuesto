import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

// Persistencia en archivo JSON local
const DB_FILE = path.join(process.cwd(), "db.json");

const loadDB = () => {
  const defaults = {
    users: [
      { id: "1", email: "marketing@pad.edu", name: "Jefa de Marketing", role: "JEFA_MARKETING", active: true, password: "admin" },
      { id: "2", email: "producto@pad.edu", name: "Jefa de Producto", role: "JEFA_PRODUCTO", active: true, password: "user" }
    ],
    categories: [],
    activities: [],
    academicYears: [],
    products: [],
    budgetPlans: [],
    expenses: [],
    auditLogs: []
  };

  if (fs.existsSync(DB_FILE)) {
    try {
      const loaded = JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
      return { ...defaults, ...loaded };
    } catch (e) {
      console.error("Error loading DB, using defaults", e);
      return defaults;
    }
  }
  return defaults;
};

let db = loadDB();

const saveDB = () => {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
};

const logAudit = (req: express.Request, action: string, entity: string, details: string) => {
  const userId = (req.headers["x-user-id"] as string) || "system";
  const userName = (req.headers["x-user-name"] as string) || "Sistema";
  
  db.auditLogs.push({
    id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    action,
    entity,
    details
  });
  saveDB();
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword, token: "mock-jwt-token" });
    } else {
      res.status(401).json({ error: "Credenciales inválidas" });
    }
  });

  app.get("/api/users", (req, res) => res.json(db.users));
  app.put("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const index = db.users.findIndex(u => u.id === id);
    if (index !== -1) {
      const oldUser = { ...db.users[index] };
      db.users[index] = { ...db.users[index], ...req.body };
      logAudit(req, "UPDATE", "USER", `Usuario actualizado: ${db.users[index].email}`);
      res.json(db.users[index]);
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });
  app.post("/api/users", (req, res) => {
    const newUser = { ...req.body, id: Date.now().toString(), password: "password123", active: true };
    db.users.push(newUser);
    logAudit(req, "CREATE", "USER", `Usuario creado: ${newUser.email}`);
    res.json(newUser);
  });
  app.post("/api/users/reset-password", (req, res) => {
    const { userId, newPassword } = req.body;
    const user = db.users.find(u => u.id === userId);
    if (user) {
      user.password = newPassword;
      logAudit(req, "UPDATE", "USER", `Contraseña restablecida para el usuario: ${user.email}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });

  app.delete("/api/users/:id", (req, res) => {
    const { id } = req.params;
    const user = db.users.find(u => u.id === id);
    if (user) {
      db.users = db.users.filter(u => u.id !== id);
      logAudit(req, "DELETE", "USER", `Usuario eliminado: ${user.email}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Usuario no encontrado" });
    }
  });

  app.get("/api/products", (req, res) => res.json(db.products));
  app.post("/api/products", (req, res) => {
    const newProduct = { ...req.body, id: Date.now().toString() };
    db.products.push(newProduct);
    logAudit(req, "CREATE", "PRODUCT", `Producto creado: ${newProduct.name}`);
    res.json(newProduct);
  });

  app.put("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const index = db.products.findIndex(p => p.id === id);
    if (index !== -1) {
      db.products[index] = { ...db.products[index], ...req.body };
      logAudit(req, "UPDATE", "PRODUCT", `Producto actualizado: ${db.products[index].name}`);
      res.json(db.products[index]);
    } else {
      res.status(404).json({ error: "Producto no encontrado" });
    }
  });

  app.delete("/api/products/:id", (req, res) => {
    const { id } = req.params;
    const product = db.products.find(p => p.id === id);
    if (product) {
      db.products = db.products.filter(p => p.id !== id);
      
      db.budgetPlans = db.budgetPlans.filter(p => p.productId !== id);
      db.expenses = db.expenses.filter(e => e.productId !== id);
      logAudit(req, "DELETE", "PRODUCT", `Producto eliminado: ${product.name}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Producto no encontrado" });
    }
  });

  app.get("/api/categories", (req, res) => res.json(db.categories));
  app.put("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const index = db.categories.findIndex(c => c.id === id);
    if (index !== -1) {
      db.categories[index] = { ...db.categories[index], ...req.body };
      logAudit(req, "UPDATE", "CATEGORY", `Categoría actualizada: ${db.categories[index].name}`);
      res.json(db.categories[index]);
    } else {
      res.status(404).json({ error: "Categoría no encontrada" });
    }
  });
  app.post("/api/categories", (req, res) => {
    const newCat = { ...req.body, id: Date.now().toString() };
    db.categories.push(newCat);
    logAudit(req, "CREATE", "CATEGORY", `Categoría creada: ${newCat.name}`);
    res.json(newCat);
  });
  app.delete("/api/categories/:id", (req, res) => {
    const { id } = req.params;
    const cat = db.categories.find(c => c.id === id);
    if (cat) {
      db.categories = db.categories.filter(c => c.id !== id);
      
      db.activities = db.activities.filter(a => a.categoryId !== id);
      logAudit(req, "DELETE", "CATEGORY", `Categoría eliminada: ${cat.name}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Categoría no encontrada" });
    }
  });

  app.get("/api/activities", (req, res) => res.json(db.activities));
  app.put("/api/activities/:id", (req, res) => {
    const { id } = req.params;
    const index = db.activities.findIndex(a => a.id === id);
    if (index !== -1) {
      db.activities[index] = { ...db.activities[index], ...req.body };
      logAudit(req, "UPDATE", "ACTIVITY", `Actividad actualizada: ${db.activities[index].name}`);
      res.json(db.activities[index]);
    } else {
      res.status(404).json({ error: "Actividad no encontrada" });
    }
  });
  app.post("/api/activities", (req, res) => {
    const newAct = { ...req.body, id: Date.now().toString() };
    db.activities.push(newAct);
    logAudit(req, "CREATE", "ACTIVITY", `Actividad creada: ${newAct.name}`);
    res.json(newAct);
  });
  app.delete("/api/activities/:id", (req, res) => {
    const { id } = req.params;
    const act = db.activities.find(a => a.id === id);
    if (act) {
      db.activities = db.activities.filter(a => a.id !== id);
      logAudit(req, "DELETE", "ACTIVITY", `Actividad eliminada: ${act.name}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Actividad no encontrada" });
    }
  });

  app.get("/api/academic-years", (req, res) => res.json(db.academicYears));
  app.post("/api/academic-years", (req, res) => {
    const newYear = { ...req.body, id: Date.now().toString() };
    db.academicYears.push(newYear);
    logAudit(req, "CREATE", "ACADEMIC_YEAR", `Año académico creado: ${newYear.year}`);
    res.json(newYear);
  });
  app.put("/api/academic-years/:id", (req, res) => {
    const { id } = req.params;
    const index = db.academicYears.findIndex(y => y.id === id);
    if (index !== -1) {
      db.academicYears[index] = { ...db.academicYears[index], ...req.body };
      logAudit(req, "UPDATE", "ACADEMIC_YEAR", `Año académico actualizado: ${db.academicYears[index].year}`);
      res.json(db.academicYears[index]);
    } else {
      res.status(404).json({ error: "Año no encontrado" });
    }
  });
  app.delete("/api/academic-years/:id", (req, res) => {
    const { id } = req.params;
    const year = db.academicYears.find(y => y.id === id);
    if (year) {
      db.academicYears = db.academicYears.filter(y => y.id !== id);
      logAudit(req, "DELETE", "ACADEMIC_YEAR", `Año académico eliminado: ${year.year}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Año no encontrado" });
    }
  });

  app.get("/api/expenses", (req, res) => res.json(db.expenses));
  app.post("/api/expenses", (req, res) => {
    const newExpense = { ...req.body, id: Date.now().toString() };
    db.expenses.push(newExpense);
    logAudit(req, "CREATE", "EXPENSE", `Gasto registrado: $${newExpense.amount} para producto ID ${newExpense.productId}`);
    res.json(newExpense);
  });

  app.put("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const index = db.expenses.findIndex(e => e.id === id);
    if (index !== -1) {
      db.expenses[index] = { ...db.expenses[index], ...req.body };
      logAudit(req, "UPDATE", "EXPENSE", `Gasto actualizado: $${db.expenses[index].amount} para producto ID ${db.expenses[index].productId}`);
      res.json(db.expenses[index]);
    } else {
      res.status(404).json({ error: "Gasto no encontrado" });
    }
  });

  app.delete("/api/expenses/:id", (req, res) => {
    const { id } = req.params;
    const expense = db.expenses.find(e => e.id === id);
    if (expense) {
      db.expenses = db.expenses.filter(e => e.id !== id);
      logAudit(req, "DELETE", "EXPENSE", `Gasto eliminado: $${expense.amount} para producto ID ${expense.productId}`);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Gasto no encontrado" });
    }
  });

  app.get("/api/budget-plans", (req, res) => res.json(db.budgetPlans));
  app.post("/api/budget-plans", (req, res) => {
    const plans = Array.isArray(req.body) ? req.body : [req.body];
    
    plans.forEach(newPlan => {
      const index = db.budgetPlans.findIndex(p => p.id === newPlan.id);
      if (index !== -1) {
        db.budgetPlans[index] = newPlan;
      } else {
        db.budgetPlans.push(newPlan);
      }
    });
    
    logAudit(req, "UPDATE", "BUDGET_PLAN", `Presupuesto actualizado/creado para ${plans.length} actividades`);
    res.json({ success: true, count: plans.length });
  });
  app.get("/api/audit-logs", (req, res) => res.json(db.auditLogs));

  // Middleware Vite para desarrollo
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";

const router = express.Router();



// Create a single grade entry
router.post("/", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let newDocument = req.body;
    // rename fields for backwards compatibility
    if (newDocument.student_id) {
      newDocument.learner_id = newDocument.student_id;
      delete newDocument.student_id;
    }
    let result = await collection.insertOne(newDocument);
    res.send(result).status(204);
  } catch (error) {
    console.log(error);
  }
});



// Get a single grade entry
router.get("/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { _id: ObjectId(req.params.id) };
    let result = await collection.findOne(query);

    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }
});

// Add a score to a grade entry
router.patch("/:id/add", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { _id: ObjectId(req.params.id) };

    let result = await collection.updateOne(query, {
      $push: { scores: req.body }
    });
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }
});

// Remove a score from a grade entry
router.patch("/:id/remove", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { _id: ObjectId(req.params.id) };

    let result = await collection.updateOne(query, {
      $pull: { scores: req.body }
    });
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }
});

// Delete a single grade entry
router.delete("/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { _id: ObjectId(req.params.id) };
    let result = await collection.deleteOne(query);
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }

});

// Get route for backwards compatibility
router.get("/student/:id", async (req, res) => {
  res.redirect(`learner/${req.params.id}`);
});

// Get a learner's grade data
router.get("/learner/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { learner_id: Number(req.params.id) };
    // Check for class_id parameter
    if (req.query.class) query.class_id = Number(req.query.class);
    let result = await collection.find(query).toArray();
    res.send(result).status(200);

  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }
});

// Delete a learner's grade data
router.delete("/learner/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { learner_id: Number(req.params.id) };
    let result = await collection.deleteOne(query);
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }
});

// Get a class's grade data
router.get("/class/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { class_id: Number(req.params.id) };

    // Check for learner_id parameter
    if (req.query.learner) query.learner_id = Number(req.query.learner);

    let result = await collection.find(query).toArray();
    res.send(result).status(200);

  } catch (error) {
    res.send("Not found").status(404);
    console.log(error);
  }

});

// Update a class id
router.patch("/class/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { class_id: Number(req.params.id) };
    let result = await collection.updateMany(query, {
      $set: { class_id: req.body.class_id }
    });
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
  }
});

// Delete a class
router.delete("/class/:id", async (req, res) => {
  try {
    let collection = await db.collection("grades");
    let query = { class_id: Number(req.params.id) };
    let result = await collection.deleteMany(query);
    res.send(result).status(200);
  } catch (error) {
    res.send("Not found").status(404);
    console.log(error)
  }
});

export default router;

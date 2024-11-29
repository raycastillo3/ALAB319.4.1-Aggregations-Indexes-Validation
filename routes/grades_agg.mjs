import express from "express";
import db from "../db/conn.mjs";
import { ObjectId } from "mongodb";


const router = express.Router();

/**
 * It is not best practice to seperate these routes
 * like we have done here. This file was created
 * specifically for educational purposes, to contain
 * all aggregation routes in one place.
 */

/**
 * Grading Weights by Score Type:
 * - Exams: 50%
 * - Quizes: 30%
 * - Homework: 20%
 */
// single-field indexes:
async function createIndexes() {
  //single field index
  await db.collection("grades").createIndex({ class_id: 1 });
  await db.collection("grades").createIndex({ learner_id: 1 });

  //compound index
  await db.collection("grades").createIndex({learner_id: 1, class_id: 1})

}
createIndexes();

async function validatingSchema() {
  const schema = {
    validator: {
      $jsonSchema: {
        bsonType: "object",
        required: ["class_id", "learner_id"],
        properties: {
          class_id: {
            bsonType: "int",
            minimum: 0,
            maximum: 300,
            exclusiveMaximum: false,
            description: "class_id must be an integer.",
          },
          learner_id: {
            bsonType: "int",
            minimum: 0,
            description: "ID must be an integer & must be greater than or equal to 0",
          },
        },
      },
    },
    validationAction: "warn",
    validationLevel: "strict",
  }
  await db.command({
    collMod: "grades",
    validator: schema.validator,
    validationAction: "error",
    validationLevel: "strict"
  });
}

validatingSchema();

//use this function to try to insert an invalid document.
async function insertOneTest() {
  await db.collection("grades").insertOne({
    class_id: '33390',
    learner_id: '2',
    scores: [{ type: 'exam', score: 80 }, { type: 'quiz', score: 70}, {type: 'homework', score: 90}, {type: 'homework', score: 100}]
  })
  // await db.collection("grades").deleteMany({
  //   class_id:'hello'
  // })
}
// insertOneTest();

// route /grades/stats:
router.get("/stats", async (req, res, next) => {
  let collection = await db.collection("grades");

  let result = await collection.aggregate([
    {
      "$unwind": "$scores"
    },
    {
      "$group": {
        "_id": "$learner_id",
        "exams": {
          "$push": {
            "$cond": [
              { "$eq": ["$scores.type", "exam"] },
              "$scores.score",
              "$$REMOVE"
            ]
          }
        },
        "quizzes": {
          "$push": {
            "$cond": [
              { "$eq": ["$scores.type", "quiz"] },
              "$scores.score",
              "$$REMOVE"
            ]
          }
        },
        "homework": {
          "$push": {
            "$cond": [
              { "$eq": ["$scores.type", "homework"] },
              "$scores.score",
              "$$REMOVE"
            ]
          }
        }
      }
    },
    {
      "$project": {
        _id: 0,
        class_id: "$_id",
        "avg": {
          "$sum": [
            { "$multiply": [{ "$avg": "$exams" }, 0.5] },
            { "$multiply": [{ "$avg": "$quizzes" }, 0.3] },
            { "$multiply": [{ "$avg": "$homework" }, 0.2] }
          ]
        }
      }
    },
    {
      "$match": { "avg": { "$gt": 70 } }
    }
  ])
  .toArray();

  const totalLearners = (await collection.distinct("learner_id")).length;
  const learnersWith70 = result.length;
  const percentageOfLearners = (learnersWith70 / totalLearners)*100
  if (!result) res.send("Not found").status(404);
  else res.send({totalLearners, learnersWith70, percentageOfLearners}).status(200);
})

router.get("/stats/:id", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection.aggregate([
    {
      $match: { class_id: Number(req.params.id) },
    },
    {
      $unwind: { path: "$scores" },
    },
    {
      $group: {
        _id: "$class_id",
        quiz: {
          $push: {
            $cond: {
              if: { $eq: ["$scores.type", "quiz"] },
              then: "$scores.score",
              else: "$$REMOVE",
            },
          },
        },
        exam: {
          $push: {
            $cond: {
              if: { $eq: ["$scores.type", "exam"] },
              then: "$scores.score",
              else: "$$REMOVE",
            },
          },
        },
        homework: {
          $push: {
            $cond: {
              if: { $eq: ["$scores.type", "homework"] },
              then: "$scores.score",
              else: "$$REMOVE",
            },
          },
        },
      },
    },
    {
      $project: {
        _id: "$learner_id",
        class_id: "$_id",
        avg: {
          $sum: [
            { $multiply: [{ $avg: "$exam" }, 0.5] },
            { $multiply: [{ $avg: "$quiz" }, 0.3] },
            { $multiply: [{ $avg: "$homework" }, 0.2] },
          ],
        },
      },
    },
  ]).toArray();

  if (!result) res.send("Not found").status(404)
  else res.send(result).status(200)
});

// Get the weighted average of a specified learner's grades, per class
router.get("/learner/:id/avg-class", async (req, res) => {
  let collection = await db.collection("grades");

  let result = await collection
    .aggregate([
      {
        $match: { learner_id: Number(req.params.id) },
      },
      {
        $unwind: { path: "$scores" },
      },
      {
        $group: {
          _id: "$class_id",
          quiz: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "quiz"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          exam: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "exam"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
          homework: {
            $push: {
              $cond: {
                if: { $eq: ["$scores.type", "homework"] },
                then: "$scores.score",
                else: "$$REMOVE",
              },
            },
          },
        },
      },
      {
        $project: {
          _id: "$learner_id",
          class_id: "$_id",
          avg: {
            $sum: [
              { $multiply: [{ $avg: "$exam" }, 0.5] },
              { $multiply: [{ $avg: "$quiz" }, 0.3] },
              { $multiply: [{ $avg: "$homework" }, 0.2] },
            ],
          },
        },
      },
    ])
    .toArray();

  if (!result) res.send("Not found").status(404);
  else res.send(result).status(200);
});

export default router;

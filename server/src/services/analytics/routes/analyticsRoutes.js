import express from "express";
import analyticsContainer from "../dependencies/dependencies.js"
import authenticate from "../../../shared/middlewares/authenticate.js"

const { analyticsController } = analyticsContainer.controllers

const router = express.Router()

router.get('/stats', authenticate, (req, res, next) => analyticsController.getStats(req, res, next))
router.get("/dashboard", authenticate, (req, res, next) => analyticsController.getDashboard(req, res, next))

export default router
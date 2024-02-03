import { Router } from "express";
import { ENVIRONMENT } from "../Modules/Constants";
import { RequireAuthentication, ValidateBody } from "../Modules/Middleware";
import { User, UserPermissions } from "../Schemas/User";
import j from "joi";
import { Song } from "../Schemas/Song";

const App = Router();

// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING
// ! NEVER EVER ENABLE THESE ON PRODUCTION OR STAGING

App.use((req, res, next) => {
    if (ENVIRONMENT !== "dev" && ENVIRONMENT !== "debug")
        return res.status(403).send("The current server environment does not allow for debugging endpoints. Switch to `dev` or `debug` to enable them.");

    next();
})

App.post("/update/permissions",
RequireAuthentication(),
ValidateBody(j.object({
    Perms: j.number().valid(...(Object.values(UserPermissions).filter(x => !isNaN(Number(x))))).required()
})),
async (req, res) => {
    req.user!.PermissionLevel! = req.body.Perms as UserPermissions;
    await req.user!.save();
    res.json(req.user);
})

App.get("/raw/song/:SongID",
async (req, res) => res.json(await Song.findOne({ where: { ID: req.params.SongID } })));

App.get("/raw/user/:UserID",
async (req, res) => res.json(await User.findOne({ where: { ID: req.params.UserID } })));

export default {
    App,
    DefaultAPI: "/api/debug"
}
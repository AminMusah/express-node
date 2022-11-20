const router = require("express").Router();
const User = require("../model/User");
const verify = require("../verifyToken");

router.get("/users",verify, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    res.send({user});
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;

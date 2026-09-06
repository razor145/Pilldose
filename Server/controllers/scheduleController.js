const Schedule = require("../models/Schedule");

exports.markTaken = async (req, res) => {

    try {

        const schedule =
            await Schedule.findByIdAndUpdate(
                req.params.id,
                {
                    status: "TAKEN"
                },
                {
                    new: true
                }
            );

        res.json(schedule);

    } catch (err) {

        res.status(500).json({
            message: err.message
        });
    }

};

exports.createSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!schedules || schedules.length === 0) {
      return res.status(400).json({ message: "No schedules provided" });
    }

    console.log("📥 Incoming schedules:", schedules);

    let results = [];

    for (const item of schedules) {
      const updated = await Schedule.findOneAndUpdate(
        {
          patientId: item.patientId,
          date: item.date,
          timeSlot: item.timeSlot,
          actualTime: item.actualTime // 🔥 key uniqueness
        },
        {
          $set: {
            medicine: item.medicine,
            status: item.status
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      results.push(updated);
    }

    console.log("✅ Upserted schedules:", results.length);

    res.json({
      message: "Schedules created/updated successfully",
      count: results.length
    });

  } catch (err) {
    console.error("❌ ERROR saving schedules:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getSchedulesForPatient = async (req, res) => {
  try {
    const { patientId } = req.params;

    const schedules = await Schedule.find({ patientId });

    res.json(schedules);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;

    await Schedule.findByIdAndDelete(id);

    res.json({ message: "Deleted successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Delete failed" });
  }
};
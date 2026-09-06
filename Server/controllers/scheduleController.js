exports.createSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!schedules || schedules.length === 0) {
      return res.status(400).json({
        message: "No schedules provided"
      });
    }

    console.log("📥 Incoming schedules:", schedules);

    let results = [];

    for (const item of schedules) {

      /*
       * Each MEDICINE is a separate database record.
       *
       * Same:
       *   patientId
       *   date
       *   timeSlot
       *   actualTime
       *
       * is allowed.
       *
       * Medicine makes the record unique.
       */

      const updated = await Schedule.findOneAndUpdate(
        {
          patientId: item.patientId,
          date: item.date,
          timeSlot: item.timeSlot,
          actualTime: item.actualTime,
          medicine: item.medicine
        },
        {
          $set: {
            medicine: item.medicine,
            status: item.status || "PENDING",
            actualTime: item.actualTime
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
      count: results.length,
      schedules: results
    });

  } catch (err) {

    console.error("❌ ERROR saving schedules:", err);

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
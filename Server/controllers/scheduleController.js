exports.createSchedule = async (req, res) => {
  try {
    const { schedules } = req.body;

    if (!schedules || schedules.length === 0) {
      return res.status(400).json({
        message: "No schedules provided"
      });
    }

    console.log("📥 Incoming schedules:", schedules);

    const results = [];

    /*
     * ============================================================
     * STEP 1
     * Validate that each patient/date/timeSlot has only ONE time.
     * ============================================================
     */

    const slotTimes = {};

    for (const item of schedules) {

      const slotKey =
        `${item.patientId}_${item.date}_${item.timeSlot}`;

      if (!slotTimes[slotKey]) {
        slotTimes[slotKey] = item.actualTime;
      }

      if (slotTimes[slotKey] !== item.actualTime) {

        return res.status(400).json({
          message:
            `Multiple times are not allowed for ${item.timeSlot} ` +
            `on ${item.date}. All medicines in this slot must use ` +
            `${slotTimes[slotKey]}.`
        });
      }
    }


    /*
     * ============================================================
     * STEP 2
     * Check existing database records.
     *
     * If this slot already has a time, don't allow another time.
     * ============================================================
     */

    for (const item of schedules) {

      const existingSlot = await Schedule.findOne({
        patientId: item.patientId,
        date: item.date,
        timeSlot: item.timeSlot
      });

      if (
        existingSlot &&
        existingSlot.actualTime !== item.actualTime
      ) {

        return res.status(400).json({
          message:
            `${item.timeSlot} on ${item.date} is already scheduled ` +
            `for ${existingSlot.actualTime}. ` +
            `All medicines in this slot must use the same time.`
        });
      }
    }


    /*
     * ============================================================
     * STEP 3
     * Save each medicine as a separate document.
     *
     * Multiple medicines are allowed in the same slot.
     * ============================================================
     */

    for (const item of schedules) {

      const medicineName = item.medicine.trim();

      if (!medicineName) {
        continue;
      }

      const updated = await Schedule.findOneAndUpdate(
        {
          patientId: item.patientId,
          date: item.date,
          timeSlot: item.timeSlot,
          actualTime: item.actualTime,
          medicine: medicineName
        },
        {
          $set: {
            medicine: medicineName,
            actualTime: item.actualTime,
            status: item.status || "PENDING"
          }
        },
        {
          upsert: true,
          new: true
        }
      );

      results.push(updated);
    }


    console.log(
      "✅ Saved schedules:",
      results.length
    );


    res.json({
      message: "Schedules created/updated successfully",
      count: results.length,
      schedules: results
    });

  } catch (err) {

    console.error(
      "❌ ERROR saving schedules:",
      err
    );

    res.status(500).json({
      message: "Server error",
      error: err.message
    });
  }
};
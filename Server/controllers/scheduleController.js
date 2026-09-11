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

    const { schedules } =
      req.body;


    if (
      !schedules ||
      schedules.length === 0
    ) {

      return res.status(400).json({
        message:
          "No schedules provided"
      });
    }


    console.log(
      "📥 Incoming schedules:",
      schedules
    );


    /*
     * ============================================================
     * STEP 1
     * Make sure one compartment cannot have
     * multiple different times.
     * ============================================================
     */

    const slotTimes = {};


    for (const item of schedules) {

      const slotKey =
        `${item.patientId}_${item.date}_${item.timeSlot}`;


      if (!slotTimes[slotKey]) {

        slotTimes[slotKey] =
          item.actualTime;

      }


      if (
        slotTimes[slotKey] !==
        item.actualTime
      ) {

        return res.status(400).json({

          message:
            `Multiple times are not allowed for ` +
            `${item.timeSlot} on ${item.date}. ` +
            `All medications in this compartment ` +
            `must use ${slotTimes[slotKey]}.`

        });
      }
    }


    /*
     * ============================================================
     * STEP 2
     * Check existing database records.
     *
     * This prevents changing an existing compartment's
     * time by sending a new time.
     * ============================================================
     */

    for (const item of schedules) {

      const existingSlot =
        await Schedule.findOne({

          patientId:
            item.patientId,

          date:
            item.date,

          timeSlot:
            item.timeSlot

        });


      if (
        existingSlot &&
        existingSlot.actualTime !==
          item.actualTime
      ) {

        return res.status(400).json({

          message:
            `${item.timeSlot} on ${item.date} ` +
            `is already scheduled for ` +
            `${existingSlot.actualTime}. ` +
            `All medications in this compartment ` +
            `must use the same time.`

        });
      }
    }


    /*
     * ============================================================
     * STEP 3
     * Save EACH medication separately.
     * ============================================================
     */

    const results = [];


    for (const item of schedules) {

      const medicineName =
        item.medicine.trim();


      if (!medicineName) {
        continue;
      }


      const updated =
        await Schedule.findOneAndUpdate(

          {

            patientId:
              item.patientId,

            date:
              item.date,

            timeSlot:
              item.timeSlot,

            actualTime:
              item.actualTime,

            medicine:
              medicineName

          },

          {

            $set: {

              medicine:
                medicineName,

              actualTime:
                item.actualTime,

              status:
                item.status ||
                "PENDING"

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
      "✅ Saved medications:",
      results.length
    );


    res.json({

      message:
        "Schedules created/updated successfully",

      count:
        results.length,

      schedules:
        results

    });


  } catch (err) {

    console.error(
      "❌ ERROR saving schedules:",
      err
    );


    res.status(500).json({

      message:
        "Server error",

      error:
        err.message

    });

  }

};
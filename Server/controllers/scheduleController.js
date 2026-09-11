const Schedule = require("../models/Schedule");


// =====================================================
// MARK MEDICATION AS TAKEN
// =====================================================

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

        if (!schedule) {
            return res.status(404).json({
                message: "Schedule not found"
            });
        }

        res.json(schedule);

    } catch (err) {

        console.error("❌ Error marking medication as taken:", err);

        res.status(500).json({
            message: err.message
        });
    }

};


// =====================================================
// CREATE / UPDATE SCHEDULE
// =====================================================

exports.createSchedule = async (req, res) => {

    try {

        const { schedules } = req.body;

        if (!schedules || schedules.length === 0) {

            return res.status(400).json({
                message: "No schedules provided"
            });

        }

        console.log("📥 Incoming schedules:", schedules);


        // =================================================
        // STEP 1
        // Make sure one compartment has ONE time only
        // =================================================

        const slotTimes = {};

        for (const item of schedules) {

            const slotKey =
                `${item.patientId}_${item.date}_${item.timeSlot}`;


            // First medication establishes the compartment time
            if (!slotTimes[slotKey]) {

                slotTimes[slotKey] =
                    item.actualTime;

            }


            // Any additional medication must use same time
            if (
                slotTimes[slotKey] !==
                item.actualTime
            ) {

                return res.status(400).json({

                    message:
                        `${item.timeSlot} on ${item.date} ` +
                        `already uses ${slotTimes[slotKey]}. ` +
                        `All medications in this compartment ` +
                        `must use the same time.`

                });

            }

        }


        // =================================================
        // STEP 2
        // Check existing database records
        // Make sure an existing compartment cannot
        // suddenly get another time
        // =================================================

        for (const item of schedules) {

            const existingSlot =
                await Schedule.findOne({

                    patientId: item.patientId,

                    date: item.date,

                    timeSlot: item.timeSlot

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


        // =================================================
        // STEP 3
        // Save each medication separately
        //
        // IMPORTANT:
        // medicine is part of the lookup.
        //
        // Therefore:
        //
        // Monday MORNING 08:00 Aspirin
        // Monday MORNING 08:00 Metformin
        // Monday MORNING 08:00 Vitamin D
        //
        // become THREE MongoDB documents.
        // =================================================

        const results = [];

        for (const item of schedules) {

            const medicineName =
                item.medicine
                    ? item.medicine.trim()
                    : "";


            // Ignore empty medicine names
            if (!medicineName) {
                continue;
            }


            const updated =
                await Schedule.findOneAndUpdate(

                    {
                        patientId: item.patientId,

                        date: item.date,

                        timeSlot: item.timeSlot,

                        actualTime: item.actualTime,

                        // 🔥 IMPORTANT:
                        // Include medicine in uniqueness
                        medicine: medicineName
                    },

                    {
                        $set: {

                            medicine: medicineName,

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
            "✅ Saved schedules:",
            results.length
        );


        // =================================================
        // RESPONSE
        // =================================================

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


// =====================================================
// GET ALL SCHEDULES FOR PATIENT
// =====================================================

exports.getSchedulesForPatient = async (req, res) => {

    try {

        const { patientId } =
            req.params;


        const schedules =
            await Schedule.find({
                patientId
            });


        res.json(schedules);


    } catch (err) {

        console.error(
            "❌ Error getting schedules:",
            err
        );

        res.status(500).json({

            message:
                "Server error"

        });

    }

};


// =====================================================
// DELETE ONE MEDICATION
// =====================================================

exports.deleteSchedule = async (req, res) => {

    try {

        const { id } =
            req.params;


        const deleted =
            await Schedule.findByIdAndDelete(id);


        if (!deleted) {

            return res.status(404).json({

                message:
                    "Schedule not found"

            });

        }


        res.json({

            message:
                "Deleted successfully"

        });


    } catch (err) {

        console.error(
            "❌ Error deleting schedule:",
            err
        );

        res.status(500).json({

            message:
                "Delete failed",

            error:
                err.message

        });

    }

};
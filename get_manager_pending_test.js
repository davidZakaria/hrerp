const mongoose = require('mongoose');
const User = require('./models/User');
const Form = require('./models/Form');
const { getEffectiveManagedDepartmentsForQueries } = require('./utils/effectiveManagedDepartments');

async function runTest() {
  await mongoose.connect('mongodb://localhost:27017/hr-erp', {
      useNewUrlParser: true,
      useUnifiedTopology: true
  });
  console.log("Connected to MongoDB.");

  // Get a manager
  const manager = await User.findOne({ role: 'manager' });
  if (!manager) {
    console.log("No manager found.");
    process.exit(0);
  }

  console.log(`Manager: ${manager.name} (${manager.department})`);

  const effectiveDepts = getEffectiveManagedDepartmentsForQueries(manager);
  console.log(`Effective Depts: ${effectiveDepts}`);

  console.time('Aggregation Query');
  const pipeline = [
      {
          $lookup: {
              from: 'users',
              localField: 'user',
              foreignField: '_id',
              as: 'userInfo'
          }
      },
      { $unwind: '$userInfo' },
      {
          $match: {
              status: 'pending',
              type: { $ne: 'excuse' },
              'userInfo.department': { $in: effectiveDepts },
              'userInfo._id': { $ne: manager._id }
          }
      },
      {
          $project: {
              type: 1,
              status: 1,
              'user._id': '$userInfo._id',
              'user.name': '$userInfo.name',
              'user.department': '$userInfo.department'
          }
      },
      { $sort: { createdAt: -1 } }
  ];

  const aggregateForms = await Form.aggregate(pipeline);
  console.timeEnd('Aggregation Query');

  console.log(`Found ${aggregateForms.length} via aggregation`);

  console.time('Find Query');

  const teamMembers = await User.find({
      department: { $in: effectiveDepts },
      _id: { $ne: manager._id },
      role: 'employee',
      status: 'active'
  }).select('_id');

  const teamMemberIds = teamMembers.map(member => member._id);

  const forms = await Form.find({
      user: { $in: teamMemberIds },
      status: 'pending',
      type: { $ne: 'excuse' }
  })
  .populate('user', 'name email department')
  .sort({ createdAt: -1 });

  console.timeEnd('Find Query');

  console.log(`Found ${forms.length} via find`);

  mongoose.disconnect();
}

runTest().catch(console.error);

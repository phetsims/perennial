// Copyright 2024, University of Colorado Boulder

grunt.registerTask( 'clone-missing-repos', 'Clones missing repos', wrapTask( async () => {
  import cloneMissingRepos from '../../common/cloneMissingRepos';

  await cloneMissingRepos();
} ) );
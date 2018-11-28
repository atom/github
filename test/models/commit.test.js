import moment from 'moment';
import dedent from 'dedent-js';

import Commit, {nullCommit} from '../../lib/models/commit';

describe('Commit', function() {
  function buildCommit(override = {}) {
    return new Commit({
      sha: '0123456789abcdefghij0123456789abcdefghij',
      authorEmail: 'me@email.com',
      coAuthors: [],
      authorDate: moment('2018-11-28T12:00:00', moment.ISO_8601).unix(),
      messageSubject: 'subject',
      messageBody: 'body',
      ...override,
    });
  }

  describe('isBodyLong()', function() {
    it('returns false if the commit message body is short', function() {
      assert.isFalse(buildCommit({messageBody: 'short'}).isBodyLong());
    });

    it('returns true if the commit message body is long', function() {
      const messageBody = dedent`
        Lorem ipsum dolor sit amet, et his justo deleniti, omnium fastidii adversarium at has. Mazim alterum sea ea,
        essent malorum persius ne mei. Nam ea tempor qualisque, modus doming te has. Affert dolore albucius te vis, eam
        tantas nullam corrumpit ad, in oratio luptatum eleifend vim.

        Ea salutatus contentiones eos. Eam in veniam facete volutpat, solum appetere adversarium ut quo. Vel cu appetere
        urbanitas, usu ut aperiri mediocritatem, alia molestie urbanitas cu qui. Velit antiopam erroribus no eum,
        scripta iudicabit ne nam, in duis clita commodo sit.

        Assum sensibus oportere te vel, vis semper evertitur definiebas in. Tamquam feugiat comprehensam ut his, et eum
        voluptua ullamcorper, ex mei debitis inciderint. Sit discere pertinax te, an mei liber putant. Ad doctus
        tractatos ius, duo ad civibus alienum, nominati voluptaria sed an. Libris essent philosophia et vix. Nusquam
        reprehendunt et mea. Ea eius omnes voluptua sit.

        No cum illud verear efficiantur. Id altera imperdiet nec. Noster audiam accusamus mei at, no zril libris nemore
        duo, ius ne rebum doctus fuisset. Legimus epicurei in sit, esse purto suscipit eu qui, oporteat deserunt
        delicatissimi sea in. Est id putent accusata convenire, no tibique molestie accommodare quo, cu est fuisset
        offendit evertitur.
      `;
      assert.isTrue(buildCommit({messageBody}).isBodyLong());
    });

    it('returns false for a null commit', function() {
      assert.isFalse(nullCommit.isBodyLong());
    });
  });
});
